# TinyTrack server — tinytd + tiny-cli + tinytrack gateway
# TODO: implement build and runtime stages

FROM debian:bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc make autoconf automake libtool pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY . .

RUN ./bootstrap.sh && ./configure && make

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/tinytd/tinytd /usr/local/bin/tinytd
COPY --from=builder /build/cli/tiny-cli /usr/local/bin/tiny-cli
COPY --from=builder /build/gateway/tinytrack /usr/local/bin/tinytrack

EXPOSE 4026

CMD ["tinytd", "--no-daemon"]
