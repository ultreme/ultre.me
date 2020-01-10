.PHONY: dev
dev:
	./pre-build.sh && hugo server -D -F --disableFastRender --bind=0.0.0.0 --baseURL=/ --appendPort=false --enableGitInfo

.PHONY: build
build:
	rm -rf public
	./pre-build.sh && hugo --gc --minify
	./go-get.sh
	find public -type f -ls
