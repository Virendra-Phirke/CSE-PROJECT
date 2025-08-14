module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-tailwindcss'
  ],
  rules: {
    'at-rule-no-unknown': null,
    'color-hex-length': null,
    'color-function-notation': null,
    'alpha-value-notation': null,
    'selector-class-pattern': null,
    'keyframes-name-pattern': null,
    'declaration-empty-line-before': null,
    'rule-empty-line-before': null,
    'property-no-vendor-prefix': [true, { ignoreProperties: ['backdrop-filter'] }],
    'declaration-block-single-line-max-declarations': null
  },
  ignoreFiles: ['dist/**/*']
};
