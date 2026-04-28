import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RegisterPage from "./page";
import {
  routerPushMock,
  signInSocialMock,
  signUpEmailMock,
  toastErrorMock,
  toastSuccessMock,
} from "@/test/setup";

describe("RegisterPage", () => {
  it("shows password strength as user types", () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText("Минимум 8 символов"), { target: { value: "StrongPass123!" } });

    expect(screen.getByText("Надёжный")).toBeInTheDocument();
  });

  it("validates and submits registration form", async () => {
    signUpEmailMock.mockResolvedValueOnce({ error: null });

    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText("Ваше имя"), { target: { value: "Иван" } });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "ivan@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Минимум 8 символов"), { target: { value: "StrongPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: /Создать аккаунт →/i }));

    await waitFor(() => {
      expect(signUpEmailMock).toHaveBeenCalledWith({
        name: "Иван",
        email: "ivan@example.com",
        password: "StrongPass123!",
        callbackURL: "/dashboard",
      });
    });
    expect(toastSuccessMock).toHaveBeenCalled();
    expect(routerPushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("shows backend error and supports social auth", async () => {
    signUpEmailMock.mockResolvedValueOnce({ error: { message: "Email занят" } });

    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText("Ваше имя"), { target: { value: "Иван" } });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "ivan@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Минимум 8 символов"), { target: { value: "StrongPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: /Создать аккаунт →/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Email занят"));

    fireEvent.click(screen.getByRole("button", { name: "GitHub" }));
    expect(signInSocialMock).toHaveBeenCalledWith({ provider: "github", callbackURL: "/dashboard" });
  });
});
