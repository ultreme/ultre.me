.PHONY: dev
dev: node_modules
	./pre-build.sh
	make server

node_modules:
	npm install

.PHONY: server
server:
	hugo server -D -F --disableFastRender --bind=0.0.0.0 --baseURL=/ --appendPort=false --enableGitInfo

.PHONY: build
build:
	rm -rf public
	./pre-build.sh && hugo --gc --minify
	./go-get.sh
	find public -type f -ls
