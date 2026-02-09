# Klineo MTF Confirm - multi-timeframe: 5m base, 1h trend. Institutional-style.

from freqtrade.strategy import IStrategy, informative
from pandas import DataFrame
import talib.abstract as ta


class KlineoMTFConfirm(IStrategy):
    """
    Base 5m, informative 1h. Entry: 1h close above EMA200, 5m RSI crosses above 50.
    Exit: 5m RSI < 45. Conservative ROI.
    """

    timeframe = "5m"
    startup_candle_count = 250

    minimal_roi = {"0": 0.035, "60": 0.02, "180": 0.01, "360": 0.0}
    stoploss = -0.07

    @informative("1h")
    def populate_indicators_1h(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["ema_200"] = ta.EMA(dataframe, timeperiod=200)
        return dataframe

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # 1h trend: close above EMA200 (column merged as close_1h, ema_200_1h)
        trend_1h = dataframe["close_1h"] > dataframe["ema_200_1h"]
        # 5m RSI crosses above 50
        rsi_cross = (dataframe["rsi"] > 50) & (dataframe["rsi"].shift(1) <= 50)
        dataframe.loc[trend_1h & rsi_cross, "enter_long"] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[dataframe["rsi"] < 45, "exit_long"] = 1
        return dataframe
