# Klineo Benchmark Strategy — reference baseline for comparing all other strategies.
# Stable, low overtrading, realistic drawdowns. Clean metrics for UI.
# Freqtrade best practices: https://www.freqtrade.io/en/stable/

from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta


class KlineoBenchmarkTrend(IStrategy):
    """
    Benchmark trend strategy: EMA50/200 trend confirmation + RSI filter + volume.
    Acts as the default "safe" strategy and sets expectations for Klineo users.
    """

    timeframe = "15m"
    startup_candle_count = 250  # EMA200 + buffer

    # Swing-style ROI ladder
    minimal_roi = {"0": 0.06, "120": 0.03, "300": 0.015, "600": 0.0}
    stoploss = -0.08
    trailing_stop = True
    trailing_stop_positive = 0.01
    trailing_stop_positive_offset = 0.02
    trailing_only_offset_is_reached = True

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["ema_50"] = ta.EMA(dataframe, timeperiod=50)
        dataframe["ema_200"] = ta.EMA(dataframe, timeperiod=200)
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)
        dataframe["atr"] = ta.ATR(dataframe, timeperiod=14)
        dataframe["volume_sma"] = dataframe["volume"].rolling(window=20).mean()
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # Trend: EMA50 > EMA200
        trend_up = dataframe["ema_50"] > dataframe["ema_200"]
        # RSI between 50 and 65 (momentum but not overbought)
        rsi_ok = (dataframe["rsi"] >= 50) & (dataframe["rsi"] <= 65)
        # Volume confirmation
        vol_ok = dataframe["volume"] > dataframe["volume_sma"]
        dataframe.loc[trend_up & rsi_ok & vol_ok, "enter_long"] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # Exit when RSI weakens or trend flips
        rsi_exit = dataframe["rsi"] < 45
        trend_exit = dataframe["ema_50"] < dataframe["ema_200"]
        dataframe.loc[rsi_exit | trend_exit, "exit_long"] = 1
        return dataframe
