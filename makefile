.PHONY: build

all: build

build: |
	docker compose up -d --build
