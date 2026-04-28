import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LoginPage from "./page";
import {
  routerPushMock,
  signInEmailMock,
  signInSocialMock,
  toastErrorMock,
  toastSuccessMock,
} from "@/test/setup";

describe("LoginPage", () => {
  it("shows validation errors for empty form", async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: /Войти →/i }));

    expect(await screen.findByText("Введите email")).toBeInTheDocument();
    expect(screen.getByText("Введите пароль")).toBeInTheDocument();
  });

  it("logs in with email and redirects on success", async () => {
    signInEmailMock.mockResolvedValueOnce({ error: null });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /Войти →/i }));

    await waitFor(() => {
      expect(signInEmailMock).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
        callbackURL: "/dashboard",
      });
    });
    expect(toastSuccessMock).toHaveBeenCalled();
    expect(routerPushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("shows auth error and triggers social login", async () => {
    signInEmailMock.mockResolvedValueOnce({ error: { message: "Неверный пароль" } });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByRole("button", { name: /Войти →/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Неверный пароль"));

    fireEvent.click(screen.getByRole("button", { name: "Google" }));
    expect(signInSocialMock).toHaveBeenCalledWith({ provider: "google", callbackURL: "/dashboard" });
  });
});
