#!/usr/bin/env bash

domain=ultre.me
rootdir=public

create_package() {
    project_name="$1"
    project_url="$2"
    sub_package="$3"

    mkdir -p $rootdir/$project_name/$sub_package
    cat > $rootdir/$project_name/$sub_package/index.html <<EOF
<!DOCTYPE html>
<html>
  <head>
    <script async src="https://www.googletagmanager.com/gtag/js?id=UA-51632370-4"></script>
    <script>window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date()); gtag('config', 'UA-51632370-4');</script>
    <meta name="go-import" content="$domain/$project_name git $project_url">
    <meta name="go-source" content="$domain/$project_name $project_url $project_url/tree/master{/dir} $project_url/tree/master{/dir}/{file}#L{line}">
    <meta http-equiv="refresh" content="0; url=$project_url">
  </head>
  <body>
    <a href="$project_url">$project_url</a>.
  </body>
</html>
EOF
}

> $rootdir/go-packages.txt

while read line; do
    if echo $line | grep --silent -E '^#'; then continue; fi

    project_name=$(echo $line | awk -F, '{print $1}' | xargs)
    project_url=$(echo $line | awk -F, '{print $2}' | xargs)
    sub_packages=$(echo $line | awk -F, '{print $3}' | xargs)

    #echo "---"
    #echo "project_name: $project_name"
    #echo "project_url:  $project_url"
    #echo "sub_packages: $sub_packages"
    #echo ""

    create_package "$project_name" "$project_url" "."
    echo "$project_name" >> $rootdir/go-packages.txt
    for sub_package in $sub_packages; do
        create_package "$project_name" "$project_url" "$sub_package"
    done
done < go-get.csv
