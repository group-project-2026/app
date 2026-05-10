.PHONY: build prod

all: build

build:
	docker compose up -d --build

prod:
	docker compose -f docker-compose.prod.yml pull
	docker compose -f docker-compose.prod.yml up -d
