FROM flyio/flyctl:latest as flyio
FROM golang:buster as builder

WORKDIR /builder

ADD . .

ENV CGO_ENABLED 0
RUN go build -o server

# release image
FROM gcr.io/google-appengine/debian10

COPY --from=flyio /flyctl /
COPY --from=builder /builder/server /

WORKDIR /

ENTRYPOINT ["/server", "serve", "--dir", "/pb_data", "--http", "0.0.0.0:8090"]