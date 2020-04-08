.PHONY: dev
dev: pre-build server

.PHONY: pre-build
pre-build: node_modules
	# wiki
	rm -rf wiki.wiki
	git clone https://github.com/ultreme/wiki.wiki.git
	cd content/wiki && ln -sf ../../wiki.wiki/*.md .
	cd wiki.wiki; for file in *.md; do (cd ../content/wiki && ln -sf ../../wiki.wiki/$$file `echo "$$file" | sed 's/.md$$/.fr.md/'`); done
	# airtable
	node ./scripts/generate-airtable-pages.js

node_modules:
	npm install

.PHONY: server
server:
	hugo server -D -F --disableFastRender --bind=0.0.0.0 --baseURL=/ --appendPort=false --enableGitInfo

.PHONY: build
build: pre-build
	rm -rf public
	hugo --gc --minify
	./go-get.sh
	find public -type f -ls
