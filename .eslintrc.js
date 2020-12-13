module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	globals: {
		NodeJS: 'readonly',
	},
	env: {
		node: true,
	},
	plugins: [
		'@typescript-eslint',
	],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:import/typescript',
		'eslint-config-airbnb-base',
	],
	settings: {
		'import/resolver': {
			node: {
				extensions: [
					'.js',
					'.ts',
				],
			},
		},
	},
	rules: {
		indent: ['error', 'tab'],
		semi: ['error', 'always'],
		'@typescript-eslint/semi': ['error', 'always'],
		'no-tabs': ['error', { allowIndentationTabs: true }],
		'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		'no-dupe-class-members': 'off',
		'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
		'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		'import/extensions': [
			'error',
			'ignorePackages',
			{
				js: 'never',
				ts: 'never',
			},
		],
		'implicit-arrow-linebreak': 'off',
		'import/prefer-default-export': 'off',
		'no-console': 'off',
	},
};
