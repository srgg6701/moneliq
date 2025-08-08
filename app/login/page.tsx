'use client';
import { Form } from '@heroui/form';
import { Input } from '@heroui/input';
import { InputOtp } from '@heroui/input-otp';
export default function Login() {
  const otp = '5';
  const setOtp = () => {
    console.log('otp!');
  };

  return (
    <>
      <h1>Login</h1>
      <Form className="flex max-w-[260px] gap-4">
        <Input />
        <Input />
        <InputOtp length={6} value={otp} onValueChange={setOtp} />
      </Form>
    </>
  );
}
