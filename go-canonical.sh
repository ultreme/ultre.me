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
