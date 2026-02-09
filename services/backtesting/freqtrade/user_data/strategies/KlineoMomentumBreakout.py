# Klineo Momentum Breakout - CTA-style. Trailing only after +2%.

from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta


class KlineoMomentumBreakout(IStrategy):
    timeframe = "15m"
    startup_candle_count = 100

    minimal_roi = {"0": 0.08, "60": 0.04, "180": 0.02, "480": 0.0}
    stoploss = -0.10
    trailing_stop = True
    trailing_stop_positive = 0.02
    trailing_stop_positive_offset = 0.02
    trailing_only_offset_is_reached = True

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["donch_high"] = dataframe["high"].rolling(window=20).max()
        dataframe["donch_low"] = dataframe["low"].rolling(window=20).min()
        dataframe["atr"] = ta.ATR(dataframe, timeperiod=14)
        dataframe["volume_sma"] = dataframe["volume"].rolling(window=20).mean()
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        prev_donch_high = dataframe["donch_high"].shift(1)
        break_out = dataframe["close"] > prev_donch_high
        volume_spike = dataframe["volume"] > dataframe["volume_sma"]
        dataframe.loc[break_out & volume_spike, "enter_long"] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        inside_channel = dataframe["close"] < dataframe["donch_high"]
        below_low = dataframe["close"] < dataframe["donch_low"].shift(1)
        dataframe.loc[inside_channel | below_low, "exit_long"] = 1
        return dataframe
