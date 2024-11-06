#!/bin/sh
bundle install
npx tailwindcss -i ./assets/stylesheets/style.scss -o ./assets/stylesheets/style.css --watch
jekyll build