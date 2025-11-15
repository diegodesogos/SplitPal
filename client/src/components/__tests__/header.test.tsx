import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "../header";
import { useAppContext } from "@/context/app-context";
import { useQuery } from "@tanstack/react-query";

// Mock the useAppContext hook
vi.mock("@/context/app-context", () => ({
  useAppContext: vi.fn(),
}));

// Mock the useQuery hook
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
}));

describe("Header Component", () => {
  it("renders the header with loading state", () => {
    (useAppContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ activeGroupId: null });
    (useQuery as unknown as ReturnType<typeof vi.fn>).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "/api/groups") {
        return { data: null };
      }
      if (queryKey[0] === "/api/users") {
        return { data: [] };
      }
      return { data: [] };
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders the header with group data", () => {
    (useAppContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ activeGroupId: "group-1" });
    (useQuery as unknown as ReturnType<typeof vi.fn>).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "/api/groups") {
        return { data: { id: "group-1", name: "Test Group", participants: ["User1", "User2"] } };
      }
      if (queryKey[0] === "/api/users") {
        return { data: [] };
      }
      return { data: [] };
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByText("Test Group")).toBeInTheDocument();
    expect(screen.getByText("2 people")).toBeInTheDocument();
  });

  it("opens the group switcher modal when the button is clicked", () => {
    (useAppContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ activeGroupId: "group-1" });
    (useQuery as unknown as ReturnType<typeof vi.fn>).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "/api/groups") {
        return { data: { id: "group-1", name: "Test Group", participants: ["User1", "User2"] } };
      }
      if (queryKey[0] === "/api/users") {
        return { data: [
          { id: "group-1", name: "Test Group", participants: ["User1", "User2"] },
          { id: "group-2", name: "Another Group", participants: ["User3"] },
        ] };
      }
      return { data: [] };
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const button = screen.getByTestId("button-switch-group");
    fireEvent.click(button);

    expect(screen.getByTestId("modal-group-switcher")).toBeInTheDocument();
    expect(screen.getByTestId("button-select-group-group-1")).toBeInTheDocument();
    expect(screen.getByTestId("button-select-group-group-2")).toBeInTheDocument();
  });
});