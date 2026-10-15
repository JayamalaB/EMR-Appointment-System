import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLogin } from '../hooks/useAuth';
import { extractErrorMessage } from '../components/common/ErrorBanner';
import FormField from '../components/common/FormField';
import Button from '../components/common/Button';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const login = useLogin();

  const onSubmit = (values) => login.mutate(values);

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>EMR Appointment System</h1>
        <p className="subtitle">Sign in with your staff account</p>

        {login.isError && <div className="alert alert-error">{extractErrorMessage(login.error)}</div>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <input id="email" type="email" autoComplete="username" {...register('email')} />
          </FormField>

          <FormField label="Password" htmlFor="password" error={errors.password?.message}>
            <input id="password" type="password" autoComplete="current-password" {...register('password')} />
          </FormField>

          <Button type="submit" variant="primary" loading={login.isPending} style={{ width: '100%' }}>
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
