# Klineo Backtesting Strategy: EMA + RSI Trend
# Timeframe: 15m | Entry: EMA cross above + RSI > 52 + volume filter | Exit: EMA cross below or RSI < 45

from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta


class KlineoEmaRsiTrend(IStrategy):
    timeframe = "15m"
    startup_candle_count = 200

    minimal_roi = {"0": 0.03, "60": 0.015, "180": 0.0}
    stoploss = -0.08
    trailing_stop = True
    trailing_stop_positive = 0.01
    trailing_stop_positive_offset = 0.02
    trailing_only_offset_is_reached = True

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["ema_fast"] = ta.EMA(dataframe, timeperiod=21)
        dataframe["ema_slow"] = ta.EMA(dataframe, timeperiod=55)
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)
        dataframe["volume_sma"] = dataframe["volume"].rolling(window=20).mean()
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        cross_above = (
            (dataframe["ema_fast"] > dataframe["ema_slow"])
            & (dataframe["ema_fast"].shift(1) <= dataframe["ema_slow"].shift(1))
        )
        rsi_ok = dataframe["rsi"] > 52
        vol_ok = dataframe["volume"] > dataframe["volume_sma"]
        dataframe.loc[cross_above & rsi_ok & vol_ok, "enter_long"] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        cross_below = (
            (dataframe["ema_fast"] < dataframe["ema_slow"])
            & (dataframe["ema_fast"].shift(1) >= dataframe["ema_slow"].shift(1))
        )
        rsi_exit = dataframe["rsi"] < 45
        dataframe.loc[cross_below | rsi_exit, "exit_long"] = 1
        return dataframe
