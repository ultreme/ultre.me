#!/bin/sh

while read line; do
    if echo $line | grep --silent -E '^#'; then continue; fi

    package=$(echo $line | cut -d, -f1)
    clone=$(echo $line | cut -d, -f2)
    doc=$(echo $line | cut -d, -f3)
    homepage=$(echo $line | cut -d, -f4)

    mkdir -p docs/$package
    cat > docs/$package/index.html <<EOF
<!DOCTYPE html>
<html>
  <head>
    <script async src="https://www.googletagmanager.com/gtag/js?id=UA-51632370-4"></script>
    <script>window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date()); gtag('config', 'UA-51632370-4');</script>
    <meta name="go-import" content="ultre.me/$package git $clone">
    <meta name="go-source" content="ultre.me/$package $doc $doc/tree/master{/dir} $doc/tree/master{/dir}/{file}#L{line}">
    <meta http-equiv="refresh" content="0; url=$homepage">
  </head>
  <body>
    Nothing to see here. Please <a href="$homepage">move along</a>.
  </body>
</html>
EOF
done < go-canonical.csv
