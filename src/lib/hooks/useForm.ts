import { useState, useCallback } from 'react';
import {
    combineValidators,
    validateEmail,
    validateMaxLength,
    validateMinLength,
    validateNumber,
    validateRange,
    validateString,
    validateRequired,
    validateStrongPassword,
    type Validator,
    type Validation,
} from '~/lib/utils/validator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useForm = <T extends Record<string, any>>(
    initialValues: T,
    validation: Validation<T>,
    onSubmit: (data: T) => void
) => {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
    const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

    const validateField = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (name: keyof T, value: any) => {
            const validator = validation[name];
            if (validator) {
                const error = validator(value, name as string);
                setErrors((prevErrors) => ({
                    ...prevErrors,
                    [name]: error ?? undefined,
                }));
                return error;
            }
            return undefined;
        },
        [validation]
    );

    const handleTouch = useCallback(
        (name: keyof T) => {
            if (!touched[name]) {
                setTouched((prevTouched) => ({
                    ...prevTouched,
                    [name]: true,
                }));
            }
        },
        [touched]
    );

    const handleBlur = useCallback(
        (name: string) => {
            handleTouch(name);
            validateField(name, values[name]);
        },
        [handleTouch, validateField, values]
    );

    const handleChange = useCallback(
        (name: string, val: string | number) => {
            handleTouch(name);
            setValues((prevValues) => ({ ...prevValues, [name]: val }));
            validateField(name, val);
        },
        [handleTouch, validateField]
    );

    const resetForm = () => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
    };

    const handleSubmit = useCallback(
        (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const tempErrors: (string | undefined)[] = [];
            Object.keys(initialValues).forEach((name) => {
                touched[name as keyof T] = true;
                const error = validateField(name, values[name]);
                tempErrors.push(error);
            });
            if (tempErrors.filter((e) => !!e).length === 0) {
                onSubmit(values);
            }
        },
        [initialValues, onSubmit, touched, validateField, values]
    );

    return {
        values,
        handleChange,
        handleBlur,
        resetForm,
        errors,
        touched,
        handleSubmit,
    };
};

export default useForm;
export {
    type Validator,
    type Validation,
    combineValidators,
    validateEmail,
    validateMaxLength,
    validateMinLength,
    validateNumber,
    validateRange,
    validateString,
    validateRequired,
    validateStrongPassword,
};