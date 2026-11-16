import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().min(3, "Nome muito curto"),
    cpf: z.string().min(11, "CPF inválido"),
    socialName: z.string().optional(),
    phone: z.string().min(8, "Telefone inválido"),
    phoneConfirm: z.string().min(8, "Confirme o telefone"),
    email: z.string().email(),
    birthDate: z.string().min(1, "Informe a data de nascimento"),
    zipCode: z.string().min(8, "CEP inválido"),
    street: z.string().min(2, "Informe o logradouro"),
    addressNumber: z.string().min(1, "Informe o número"),
    neighborhood: z.string().min(2, "Informe o bairro"),
    state: z.string().length(2, "Selecione a UF"),
    city: z.string().min(2, "Selecione a cidade"),
    complement: z.string().optional(),
    password: z.string().min(8, "Mínimo 8 caracteres"),
  })
  .refine((data) => data.phone === data.phoneConfirm, {
    message: "Os telefones não coincidem",
    path: ["phoneConfirm"],
  });
export type SignupInput = z.infer<typeof signupSchema>;
