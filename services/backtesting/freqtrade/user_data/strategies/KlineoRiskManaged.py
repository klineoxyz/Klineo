# Klineo Risk Managed — safety-first strategy using Freqtrade protections.
# Demonstrates advanced risk control for copy-trading credibility.
# Run backtest with: --enable-protections
# https://www.freqtrade.io/en/stable/includes/protections/

from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta


class KlineoRiskManaged(IStrategy):
    """
    Entry: price above EMA100, RSI 50–60. Exit: RSI < 48.
    Protections:
    - MaxDrawdown: stop trading if drawdown > 15% over last 48 candles (reduces blow-ups).
    - CooldownPeriod: 3 candles after exit before re-entry (avoids revenge trading).
    - StoplossGuard: pause 4 candles if 3 stoplosses in last 24 candles (limits streak risk).
    """

    timeframe = "15m"
    startup_candle_count = 150

    minimal_roi = {"0": 0.04, "90": 0.02, "240": 0.0}
    stoploss = -0.06

    @property
    def protections(self):
        return [
            # MaxDrawdown: copy traders see reduced drawdowns; bot pauses after big DD
            {
                "method": "MaxDrawdown",
                "lookback_period_candles": 48,
                "trade_limit": 4,
                "stop_duration_candles": 12,
                "max_allowed_drawdown": 0.15,
            },
            # CooldownPeriod: no re-entry for 3 candles after exit (reduces overtrading)
            {
                "method": "CooldownPeriod",
                "stop_duration_candles": 3,
            },
            # StoplossGuard: if 3 stoplosses in 24 candles, pause 4 candles (safety net)
            {
                "method": "StoplossGuard",
                "lookback_period_candles": 24,
                "trade_limit": 3,
                "stop_duration_candles": 4,
                "only_per_pair": False,
            },
        ]

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["ema_100"] = ta.EMA(dataframe, timeperiod=100)
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        above_ema = dataframe["close"] > dataframe["ema_100"]
        rsi_ok = (dataframe["rsi"] >= 50) & (dataframe["rsi"] <= 60)
        dataframe.loc[above_ema & rsi_ok, "enter_long"] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[dataframe["rsi"] < 48, "exit_long"] = 1
        return dataframe
