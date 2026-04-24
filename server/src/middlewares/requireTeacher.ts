import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { clerkClient } from "../index";

export async function requireTeacher(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const userType = (user.publicMetadata as any)?.userType;

    if (process.env.NODE_ENV !== "production") {
      console.log("[requireTeacher] publicMetadata", {
        userId,
        userType,
        publicMetadata: user.publicMetadata,
      });
    }

    if (userType !== "teacher") {
      res.status(403).json({ message: "Teacher role required" });
      return;
    }

    (req as any).clerkUser = user;
    next();
  } catch (error) {
    res.status(500).json({ message: "Error validating teacher role", error });
  }
}

