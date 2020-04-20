all:
	for file in icone*; do convert "$$file" -resize x70 "../$$file"; done
	for file in icon-* empty*; do convert "$$file" -resize 1040x1040 "../$$file"; done
	convert screen-logo.png -resize 70x70 ../screen-logo.png
