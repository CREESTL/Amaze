module.exports = {
    overrides: [
        {
            files: "*.sol",
            rules: {
                "unit-case": null,
            },
            options: {
                bracketSpacing: false,
                printWidth: 120,
                tabWidth: 4,
                useTabs: false,
                singleQuote: false,
            },
        },
        {
            files: "*.js",
            options: {
                printWidth: 120,
                semi: true,
                tabWidth: 4,
                singleQuote: false,
                trailingComma: "es5",
            },
        },
    ],
};
