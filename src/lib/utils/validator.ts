import { camelCaseToPascalCaseWithSpace } from '~/lib/utils/helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Validator = (value: any, fieldName: string) => string | undefined;

export type Validation<T> = {
    [K in keyof T]?: Validator;
};

export const validateRequired =
    (message?: string): Validator =>
        (value, fieldName) =>
            value
                ? ''
                : message ?? `${camelCaseToPascalCaseWithSpace(fieldName)} is required`;

export const validateString =
    (message?: string): Validator =>
        (value, fieldName) =>
            typeof value === 'string'
                ? ''
                : message ??
                `${camelCaseToPascalCaseWithSpace(fieldName)} must be a string`;

export const validateEmail =
    (message?: string): Validator =>
        (value, fieldName) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            return emailRegex.test(value)
                ? ''
                : message ??
                `${camelCaseToPascalCaseWithSpace(fieldName)} must be a valid email`;
        };

export const validateStrongPassword =
    (message?: string): Validator =>
        (value, fieldName) => {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            return passwordRegex.test(value)
                ? ''
                : message ??
                `${camelCaseToPascalCaseWithSpace(fieldName)} must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.`;
        };

export const validateNumber =
    (message?: string): Validator =>
        (value, fieldName) =>
            !isNaN(Number(value))
                ? ''
                : message ??
                `${camelCaseToPascalCaseWithSpace(fieldName)} must be a number`;

export const validateMinLength =
    (min: number, message?: string): Validator =>
        (value, fieldName) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            value.length >= min
                ? ''
                : message ??
                `${camelCaseToPascalCaseWithSpace(fieldName)} must be at least ${min} characters long`;

export const validateMaxLength =
    (max: number, message?: string): Validator =>
        (value, fieldName) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            value.length <= max
                ? ''
                : message ??
                `${camelCaseToPascalCaseWithSpace(fieldName)} must be at most ${max} characters long`;

export const validateRange =
    (min: number, max: number, message?: string): Validator =>
        (value, fieldName) =>
            value >= min && value <= max
                ? ''
                : message ??
                `${camelCaseToPascalCaseWithSpace(fieldName)} must be between ${min} and ${max}`;

export const combineValidators = (...validators: Validator[]): Validator => {
    return (value, fieldName) => {
        for (const v of validators) {
            const error = v(value, fieldName)
            if (error) {
                return error
            }
        }
        return undefined;
    };
};