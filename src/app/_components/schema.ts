import * as yup from "yup";

const phoneRegex = /^[0-9+()[\]\s-]{6,}$/;

export const createSchema = yup.object({
    fullName: yup.string().trim().required('Please enter your full name.'),
    email: yup
        .string()
        .trim()
        .email('Please enter a valid email address.')
        .required('Email is required.'),
    phone: yup
        .string()
        .trim()
        .matches(phoneRegex, 'Please enter a valid phone number.')
        .required('Phone is required.'),
    skills: yup.array(yup.string()).min(1, 'At least one skill is required'),
    file: yup
        .object({
            fileName: yup.string().trim().required('Please choose a file.'),
            mime: yup
                .string()
                .oneOf(['application/pdf'], 'Only PDF files are allowed.')
                .required('File type is required.'),
            base64: yup.string().required('We could not read your file. Please try again.'),
        })
        .required('Please upload your resume (PDF).'),
    experience: yup.array()
        .of(
            yup.object({
                company: yup.string().required('Company is required'),
                position: yup.string().required('Position is required'),
                date: yup.string().required('Date is required'),
                description: yup.string().required('Description is required'),
                durationMonths: yup.number()
                    .typeError('Must be a number')
                    .positive('Must be positive')
                    .integer('Must be an integer')
                    .required('Duration is required'),
            })
        )
        .min(1, 'At least one experience entry is required'),
});

export type FormValues = yup.InferType<typeof createSchema>;