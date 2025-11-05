import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongodb"
import Waitlist from "@/lib/db/models/Waitlist"
import { waitlistSchema } from "@/lib/validations/waitlist"
import { z } from "zod"

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json()

    // Validate input
    const validatedData = waitlistSchema.parse(body)

    // Connect to database
    await dbConnect()

    // Check if email already exists
    const existingEntry = await Waitlist.findOne({ email: validatedData.email })

    if (existingEntry) {
      return NextResponse.json(
        { error: "This email is already on the waitlist" },
        { status: 400 }
      )
    }

    // Create new waitlist entry
    const waitlistEntry = await Waitlist.create(validatedData)

    return NextResponse.json(
      {
        message: "Successfully joined the waitlist!",
        data: {
          email: waitlistEntry.email,
          createdAt: waitlistEntry.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Waitlist API Error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes("duplicate key")) {
      return NextResponse.json(
        { error: "This email is already on the waitlist" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to join waitlist. Please try again." },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to check waitlist status
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email parameter required" }, { status: 400 })
    }

    await dbConnect()
    const entry = await Waitlist.findOne({ email: email.toLowerCase() })

    if (!entry) {
      return NextResponse.json({ onWaitlist: false }, { status: 200 })
    }

    return NextResponse.json(
      {
        onWaitlist: true,
        joinedAt: entry.createdAt,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Waitlist GET Error:", error)
    return NextResponse.json({ error: "Failed to check waitlist status" }, { status: 500 })
  }
}
