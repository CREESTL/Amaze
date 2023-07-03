module.exports = {
    overrides: [
        {
            files: "*.sol",
            rules: {
                "unit-case": null,
            },
            options: {
                bracketSpacing: false,
                printWidth: 100,
                tabWidth: 4,
                useTabs: false,
                singleQuote: false,
            },
        },
        {
            files: "*.js",
            options: {
                printWidth: 100,
                semi: true,
                tabWidth: 4,
                singleQuote: false,
                trailingComma: "es5",
            },
        },
    ],
};
