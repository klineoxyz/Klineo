# Klineo Backtesting: Freqtrade (invoked via CLI from Node spawn)
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential wget bash \
    && rm -rf /var/lib/apt/lists/*

# TA-Lib
RUN wget -q http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz \
    && tar xzf ta-lib-0.4.0-src.tar.gz \
    && cd ta-lib/ && ./configure --prefix=/usr && make && make install \
    && cd .. && rm -rf ta-lib ta-lib-0.4.0-src.tar.gz

WORKDIR /app
RUN pip install --no-cache-dir freqtrade pandas numpy

COPY freqtrade/ /app/freqtrade/
COPY run_backtest.sh parse_backtest.py /app/
RUN chmod +x /app/run_backtest.sh
RUN mkdir -p /app/output/raw /app/output/normalized

ENTRYPOINT ["/app/run_backtest.sh"]
CMD ["KlineoEmaRsiTrend", "15m", "BTC/USDT", "20240101-20241231"]
