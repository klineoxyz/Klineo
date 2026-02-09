# Klineo Range Revert - mean reversion. CooldownPeriod reduces overtrading.

from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta


def vwap(df: DataFrame):
    typical = (df["high"] + df["low"] + df["close"]) / 3.0
    vc = df["volume"].cumsum()
    vc = vc.where(vc > 0, 1)
    return (typical * df["volume"]).cumsum() / vc


class KlineoRangeRevert(IStrategy):
    timeframe = "5m"
    startup_candle_count = 100
    minimal_roi = {"0": 0.02, "15": 0.01, "45": 0.0}
    stoploss = -0.05
    trailing_stop = False

    @property
    def protections(self):
        return [{"method": "CooldownPeriod", "stop_duration_candles": 2}]

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        bbands = ta.BBANDS(dataframe, timeperiod=20, nbdevup=2, nbdevdn=2)
        dataframe["bb_upper"] = bbands["upperband"]
        dataframe["bb_middle"] = bbands["middleband"]
        dataframe["bb_lower"] = bbands["lowerband"]
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)
        dataframe["vwap"] = vwap(dataframe)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["close"] < dataframe["bb_lower"])
            & (dataframe["rsi"] < 30)
            & (dataframe["close"] < dataframe["vwap"]),
            "enter_long",
        ] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["close"] >= dataframe["bb_middle"]) | (dataframe["rsi"] > 55),
            "exit_long",
        ] = 1
        return dataframe
