# Klineo Backtesting Strategy: Bollinger Bands Mean Reversion
# Timeframe: 5m | Entry: close < bb_lower AND rsi < 30 | Exit: close > bb_mid OR rsi > 55

from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta


class KlineoBollingerRevert(IStrategy):
    timeframe = "5m"
    startup_candle_count = 100

    minimal_roi = {"0": 0.012, "30": 0.006, "90": 0.0}
    stoploss = -0.06

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        bbands = ta.BBANDS(dataframe, timeperiod=20, nbdevup=2, nbdevdn=2)
        dataframe["bb_upper"] = bbands["upperband"]
        dataframe["bb_middle"] = bbands["middleband"]
        dataframe["bb_lower"] = bbands["lowerband"]
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["close"] < dataframe["bb_lower"]) & (dataframe["rsi"] < 30),
            "enter_long",
        ] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["close"] > dataframe["bb_middle"]) | (dataframe["rsi"] > 55),
            "exit_long",
        ] = 1
        return dataframe
