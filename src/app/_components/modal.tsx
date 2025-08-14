'use client'

import Button from "~/lib/components/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { createSchema, type FormValues } from "./schema";
import { useState } from "react";
import { useFormik } from 'formik';
import Select from 'react-select'
import { api } from "~/trpc/react";
import { toast } from "sonner"
import { redirect } from "next/navigation"

function FieldError({ message, isError }: { message?: string, isError?: boolean }) {
    if (!isError) return null;
    return <p className="mt-[-8px] text-xs text-red-600">{message}</p>;
}

const skillOptions = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'react', label: 'React' },
    { value: 'node', label: 'Node.js' },
]

interface Props {
    isLoggedIn: boolean
}

export default function CvSubmissionModal({ isLoggedIn }: Props) {
    const [open, setOpen] = useState(false);

    const utils = api.useUtils();
    const createCv = api.cv.create.useMutation({
        onSuccess: async () => {
            toast("CV has been submitted.")
            await utils.cv.list.invalidate();
            formik.resetForm();
            setOpen(false)
        },
        onError: () => {
            toast("Something went wrong")
        }
    })

    const formik = useFormik<FormValues>({
        initialValues: {
            fullName: '',
            email: '',
            phone: '',
            skills: [],
            file: { fileName: '', mime: 'application/pdf', base64: '' },
            experience: [
                { date: '', company: '', position: '', description: '', durationMonths: 0 },
            ],
        },
        validationSchema: createSchema,
        onSubmit: (values) => {
            createCv.mutate({
                email: values.email,
                experience: values.experience ?? [],
                file: values.file,
                fullName: values.fullName,
                phone: values.phone,
                skills: (values.skills ?? []).filter((s): s is string => s !== undefined)
            })
        },
    });

    // PDF → base64
    const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            formik.setFieldError('file.mime', 'Only PDF is allowed');
            return;
        }

        const toBase64 = (f: File) =>
            new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const res = reader.result;
                    if (typeof res === 'string') resolve(res.split(',')[1] ?? '');
                    else if (res instanceof ArrayBuffer) {
                        const bytes = new Uint8Array(res);
                        let binary = '';
                        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
                        resolve(btoa(binary));
                    } else resolve('');
                };
                reader.onerror = reject;
                reader.readAsDataURL(f);
            });

        const base64 = await toBase64(file);
        await formik.setFieldValue('file', { fileName: file.name, mime: file.type, base64 });
    };

    const onOpen = () => {
        if (!isLoggedIn) redirect('/api/auth/signin')
        else setOpen(true)
    }

    const onClose = () => {
        setOpen(false)
        formik.resetForm()
    }

    const getFirstFileError = () => {
        if (formik.touched.file?.fileName && formik.errors.file?.fileName) {
            return formik.errors.file.fileName;
        } else if (formik.touched.file?.base64 && formik.errors.file?.base64) {
            return formik.errors.file.base64;
        } else if (formik.touched.file?.mime && formik.errors.file?.mime) {
            return formik.errors.file.mime;
        }
        return "";
    };


    return (
        <>
            <Button variant="secondary-filled" onClick={onOpen}>Upload CV</Button>
            <Dialog open={open}>
                <DialogContent className="sm:max-w-[600px]" onOpenAutoFocus={(e) => e.preventDefault()} onInteractOutside={onClose}>
                    <DialogHeader className="mx-2">
                        <DialogTitle>Upload CV</DialogTitle>
                        <DialogDescription>Fill out your details and attach a PDF resume.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={formik.handleSubmit}>
                        <div className="grid gap-4 max-h-[60vh] overflow-y-auto">
                            {/* Full Name */}
                            <div className="grid gap-3 mx-2">
                                <Label htmlFor="fullName" aria-required>Full Name</Label>
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    value={formik.values.fullName}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder="Your full name"
                                />
                                <FieldError
                                    isError={formik.touched.fullName && !!formik.errors.fullName}
                                    message={formik.errors.fullName}
                                />
                            </div>

                            {/* Email */}
                            <div className="grid grid-cols-2 gap-3 items-start mx-2">
                                <div className="grid gap-3">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formik.values.email}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        placeholder="you@example.com"
                                    />
                                    <FieldError
                                        isError={formik.touched.email && !!formik.errors.email}
                                        message={formik.errors.email}
                                    />
                                </div>
                                <div className="grid gap-3">
                                    <Label htmlFor="email">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="phone"
                                        value={formik.values.phone}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        placeholder="088812341234"
                                    />
                                    <FieldError
                                        isError={formik.touched.phone && !!formik.errors.phone}
                                        message={formik.errors.phone}
                                    />
                                </div>
                            </div>

                            {/* Skills */}
                            <div className="grid gap-3 mx-2">
                                <Label htmlFor="skills">Skills</Label>
                                <Select
                                    id="skills"
                                    isMulti
                                    name="skills"
                                    className="text-sm"
                                    options={skillOptions}
                                    value={skillOptions.filter(opt => formik.values.skills?.includes(opt.value))}
                                    onChange={(selected) => {
                                        return formik.setFieldValue(
                                            'skills',
                                            selected ? selected.map(opt => opt.value) : []
                                        )
                                    }}
                                    onBlur={() => formik.setFieldTouched('skills', true)}
                                />
                                <FieldError
                                    isError={formik.touched.skills && !!formik.errors.skills}
                                    message={formik.errors.skills ?? '' as string}
                                />
                            </div>

                            {/* Experience */}
                            <div className="grid gap-3 mx-2">
                                <Label>Experience</Label>
                                {formik.values.experience?.map((exp, index) => (
                                    <div key={index} className="border p-3 rounded-md space-y-3">
                                        <Input
                                            name={`experience[${index}].company`}
                                            placeholder="Company"
                                            value={exp.company}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            className="text-sm"
                                        />
                                        <FieldError
                                            isError={
                                                Array.isArray(formik.touched.experience) &&
                                                formik.touched.experience?.[index]?.company &&
                                                Array.isArray(formik.errors.experience) &&
                                                !!formik.errors.experience?.[index]?.company
                                            }
                                            message={Array.isArray(formik.errors.experience) ?
                                                formik.errors.experience?.[index]?.company : ''}
                                        />

                                        <Input
                                            name={`experience[${index}].position`}
                                            placeholder="Position"
                                            value={exp.position}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            className="text-sm"
                                        />
                                        <FieldError
                                            isError={
                                                Array.isArray(formik.touched.experience) &&
                                                formik.touched.experience?.[index]?.position &&
                                                Array.isArray(formik.errors.experience) &&
                                                !!formik.errors.experience?.[index]?.position
                                            }
                                            message={Array.isArray(formik.errors.experience) ?
                                                formik.errors.experience?.[index]?.position : ''}
                                        />

                                        <Input
                                            name={`experience[${index}].date`}
                                            placeholder="Date (e.g. 2021-2023)"
                                            value={exp.date}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            className="text-sm"
                                        />
                                        <FieldError
                                            isError={
                                                Array.isArray(formik.touched.experience) &&
                                                formik.touched.experience?.[index]?.date &&
                                                Array.isArray(formik.errors.experience) &&
                                                !!(formik.errors.experience?.[index])?.date
                                            }
                                            message={Array.isArray(formik.errors.experience) ?
                                                formik.errors.experience?.[index]?.date : ''}
                                        />

                                        <Input
                                            name={`experience[${index}].durationMonths`}
                                            placeholder="Duration (months)"
                                            type="number"
                                            value={exp.durationMonths ?? 0}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            className="text-sm"
                                        />
                                        <FieldError
                                            isError={
                                                Array.isArray(formik.touched.experience) &&
                                                formik.touched.experience?.[index]?.durationMonths &&
                                                Array.isArray(formik.errors.experience) &&
                                                !!formik.errors.experience?.[index]?.durationMonths
                                            }
                                            message={Array.isArray(formik.errors.experience) ?
                                                formik.errors.experience?.[index]?.durationMonths : ''}
                                        />

                                        <textarea
                                            name={`experience[${index}].description`}
                                            placeholder="Description"
                                            value={exp.description}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            className="w-full border rounded-md p-2 text-sm"
                                        />
                                        <FieldError
                                            isError={
                                                Array.isArray(formik.touched.experience) &&
                                                formik.touched.experience?.[index]?.description &&
                                                Array.isArray(formik.errors.experience) &&
                                                !!formik.errors.experience?.[index]?.description
                                            }
                                            message={Array.isArray(formik.errors.experience) ?
                                                formik.errors.experience?.[index]?.description : ''}
                                        />

                                        <Button
                                            type="button"
                                            variant="secondary-outlined"
                                            onClick={() => {
                                                const expCopy = [...(formik.values.experience ?? [])];
                                                expCopy.splice(index, 1);
                                                return formik.setFieldValue('experience', expCopy);
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary-filled"
                                    onClick={() => {
                                        return formik.setFieldValue('experience', [
                                            ...(formik.values.experience ?? []),
                                            { date: '', company: '', position: '', description: '', durationMonths: undefined },
                                        ])
                                    }}
                                >
                                    Add Experience
                                </Button>
                                <FieldError
                                    isError={
                                        !!formik.touched.experience &&
                                        typeof formik.errors.experience === 'string'
                                    }
                                    message={
                                        typeof formik.errors.experience === 'string'
                                            ? formik.errors.experience
                                            : ''
                                    }
                                />
                            </div>


                            {/* Resume Upload */}
                            <div className="space-y-1.5">
                                <Label htmlFor="file">Resume (PDF)</Label>
                                <Input
                                    id="file"
                                    name="file"
                                    type="file"
                                    accept="application/pdf"
                                    onChange={handlePdfChange}
                                    onBlur={formik.handleBlur}
                                />
                                <div className="text-xs text-muted-foreground">
                                    {formik.values.file.fileName ? `Selected: ${formik.values.file.fileName}` : 'No file selected'}
                                </div>
                                <FieldError
                                    isError={!!getFirstFileError()}
                                    message={getFirstFileError()}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 items-center mt-6">
                            <Button variant="secondary-outlined" onClick={onClose} disabled={createCv.isPending}>Cancel</Button>
                            <Button variant="secondary-filled" type="submit" isLoading={createCv.isPending}>
                                {createCv.isPending ? "Submitting..." : "Submit"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
