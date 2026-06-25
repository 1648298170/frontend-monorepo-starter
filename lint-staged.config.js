export default {
  "*.{js,jsx,ts,tsx,json,md,yaml,yml}": ["prettier --ignore-unknown --write"],
  "*.{js,jsx,ts,tsx}": ["eslint --fix"],
  "*.vue": [
    "prettier --ignore-unknown --write",
    "eslint --fix",
    "stylelint --fix",
  ],
  "*.{css,scss,sass}": ["prettier --ignore-unknown --write", "stylelint --fix"],
};
