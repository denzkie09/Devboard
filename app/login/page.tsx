"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {createClient} from "../../lib/supabase/client";

export default function LoginPage(){
    const[email, setEmail]=useState("");
    const[password, setPassword]=useState("");
    const[error, setError]=useState("");
    const [loading, setLoading]=useState(false);
    const router=useRouter();
    const supabase=createClient();

    async function handleLogin(e: React.FormEvent){
        e.preventDefault();
        setLoading(true);
        setError("");

        const {error}=await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if(error){
            setError(error.message);
            return;
        }
        router.refresh();
        window.location.href = "/dashboard";
    }

    return(
        <main className="flex min-h-screen flex-col items-center justify-center px-4">
            <form
                onSubmit={handleLogin}
                className="w-full max-w-sm rounded-lg border border-neutral-200 p-6 "
                >
                    <h1 className="mb-4 text-xl font-semibold">Log in to DevBoard</h1>

                    <label className="mb-1 block text-sm text-neutral-600">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e)=>setEmail(e.target.value)}
                        required
                        className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    />

                    <label className="mb-1 block text-sm text-neutral-600">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e)=>setPassword(e.target.value)}
                        required
                        className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    />

                    {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-md bg-black py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                        >
                            {loading ? "Logging in..." : "Log in"}
                    </button>

                    <p className="mt-4 text-center text-sm text-neutral-500">
                        Don't have an account?{" "}
                        <a href="/signup" className="underline">
                            Sign up
                        </a>

                    </p>
            </form>

        </main>
    );
}