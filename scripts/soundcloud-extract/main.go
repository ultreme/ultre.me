package main

import (
	"fmt"
	"log"
	"net/url"
	"os"
	"strings"

	"github.com/antchfx/htmlquery"
)

func main() {
	err := do(os.Args[1])
	if err != nil {
		log.Fatal("error: %v", err)
	}
}

func do(scUrl string) error {
	doc, err := htmlquery.LoadURL(scUrl)
	if err != nil {
		return err
	}

	nodes, err := htmlquery.QueryAll(doc, "/html/head/meta")
	if err != nil {
		return err
	}
	for _, node := range nodes {
		isTwitterPlayer := false
		for _, attr := range node.Attr {
			if attr.Key == "property" && attr.Val == "twitter:player" {
				isTwitterPlayer = true
			}
		}
		if isTwitterPlayer {
			for _, attr := range node.Attr {
				if attr.Key == "content" {
					u, err := url.Parse(attr.Val)
					if err != nil {
						return err
					}
					player := u.Query().Get("url")
					p, err := url.Parse(player)
					if err != nil {
						return err
					}
					id := strings.Split(p.Path, "/")[2]
					token := p.Query().Get("secret_token")
					fmt.Printf("%s\t%s\n", id, token)
				}
			}
		}
	}
	return nil
}
