.PHONY: build
build:
	rm -rf public
	cp -rf docs public
	./go-get.sh
