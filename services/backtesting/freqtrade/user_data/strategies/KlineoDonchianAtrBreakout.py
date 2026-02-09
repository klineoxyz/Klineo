# Klineo Backtesting Strategy: Donchian + ATR Breakout
# Timeframe: 15m | Entry: close > donch_high.shift(1) | Exit: close < donch_low.shift(1)

from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta


class KlineoDonchianAtrBreakout(IStrategy):
    timeframe = "15m"
    startup_candle_count = 100

    minimal_roi = {"0": 0.04, "120": 0.015, "360": 0.0}
    stoploss = -0.10

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["donch_high"] = dataframe["high"].rolling(window=20).max()
        dataframe["donch_low"] = dataframe["low"].rolling(window=20).min()
        dataframe["atr"] = ta.ATR(dataframe, timeperiod=14)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # Entry: close > previous candle's donchian high
        prev_donch_high = dataframe["donch_high"].shift(1)
        dataframe.loc[
            dataframe["close"] > prev_donch_high,
            "enter_long",
        ] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # Exit: close < previous candle's donchian low
        prev_donch_low = dataframe["donch_low"].shift(1)
        dataframe.loc[
            dataframe["close"] < prev_donch_low,
            "exit_long",
        ] = 1
        return dataframe
