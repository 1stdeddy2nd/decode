// Converts camelCase to PascalCase
export function camelCaseToPascalCase(input: string): string {
    return input.replace(/^[a-z]/, (match) => match.toUpperCase());
}

// Converts camelCase to PascalCase with spaces (e.g., "camelCase" -> "Camel Case")
export function camelCaseToPascalCaseWithSpace(input: string): string {
    return input
        .replace(/^[a-z]/, (match) => match.toUpperCase())
        .replace(/([A-Z])/g, ' $1')
        .trim();
}

// Converts camelCase to kebab-case
export function camelToKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}