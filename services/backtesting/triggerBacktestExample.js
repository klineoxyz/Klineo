/**
 * Example: trigger Freqtrade backtest from Node and read normalized output.
 * Not integrated with the main backend yet — run from services/backtesting or project root.
 *
 * Usage (from repo root):
 *   node services/backtesting/triggerBacktestExample.js
 * Or from services/backtesting:
 *   node triggerBacktestExample.js
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const BACKTEST_DIR = path.resolve(__dirname);
const SCRIPT = path.join(BACKTEST_DIR, "run_backtest.sh");

const strategy = "KlineoEmaRsiTrend";
const timeframe = "15m";
const pairs = "BTC/USDT";
const timerange = "20240101-20241231";

function runBacktest() {
  return new Promise((resolve, reject) => {
    const child = spawn("bash", [SCRIPT, strategy, timeframe, pairs, timerange], {
      cwd: BACKTEST_DIR,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });

    child.on("error", (err) => {
      reject(err);
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Backtest exited with code ${code}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

function main() {
  const safeTimerange = timerange.replace(/\//g, "_");
  const normalizedPath = path.join(
    BACKTEST_DIR,
    "output",
    "normalized",
    `${strategy}_${timeframe}_${safeTimerange}.json`
  );

  console.log("Triggering backtest:", { strategy, timeframe, pairs, timerange });
  console.log("---\n");

  runBacktest()
    .then(() => {
      if (!fs.existsSync(normalizedPath)) {
        console.error("Normalized output not found at", normalizedPath);
        process.exit(1);
      }
      const data = JSON.parse(fs.readFileSync(normalizedPath, "utf8"));
      const m = data.metrics || {};
      console.log("\n--- Summary ---");
      console.log("Total trades:", m.total_trades);
      console.log("Win rate (%):", m.win_rate);
      console.log("Profit %:", m.profit_percent);
      console.log("Max drawdown %:", m.max_drawdown_percent);
      console.log("Avg trade duration (min):", m.avg_trade_duration_minutes);
      console.log("tv_ohlc candles:", (data.tv_ohlc || []).length);
      console.log("tv_equity points:", (data.tv_equity || []).length);
      console.log("\nFirst 5 trades:");
      (data.trades || []).slice(0, 5).forEach((t, i) => {
        console.log(
          `  ${i + 1}. ${t.pair} open=${t.open_rate} close=${t.close_rate} profit_abs=${t.profit_abs} win=${t.is_win}`
        );
      });
    })
    .catch((err) => {
      console.error("Backtest failed:", err.message);
      process.exit(1);
    });
}

main();
