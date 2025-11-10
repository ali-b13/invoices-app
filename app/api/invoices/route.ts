import { connectDB } from "@/lib/mongodb"
import { Invoice } from "@/lib/models/Invoice"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth, checkPermission } from "@/app/api/auth/auth-helper"



export async function POST(request: NextRequest) {
  try {
    // Verify authentication first
    const auth = await verifyAuth(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // Check permissions if needed
    if (!checkPermission(auth.user?.permissions, 'create_invoice')) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    await connectDB()
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: "Missing required 'id' field" }, { status: 400 })
    }
    
    const cleanData = { 
      ...body,
      _id: body.id,
    }
    delete cleanData.id

    const existing = await Invoice.findById(cleanData._id)

    if (existing) {
      const incomingLastModified = new Date(cleanData.lastModified).getTime()
      const existingLastModified = new Date(existing.lastModified).getTime()

      if (incomingLastModified < existingLastModified) {
        console.log(`[API] Create Invoice Conflict: Skipping older update for Invoice ${cleanData._id}`)
        return NextResponse.json(existing)
      }
    }
    
    const duplicateInvoiceNumber = await Invoice.findOne({ 
      invoiceNumber: cleanData.invoiceNumber, 
      _id: { $ne: cleanData._id }
    })
    
    if (duplicateInvoiceNumber) {
      return NextResponse.json({ error: "Duplicate invoice number detected." }, { status: 409 })
    }
    
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      cleanData._id,
      cleanData,
      { 
        new: true, 
        upsert: true,
        runValidators: true,
      }
    )

    const formatted = {
      ...updatedInvoice.toObject(),
      id: updatedInvoice._id.toString(),
    }
    delete formatted._id

    return NextResponse.json(formatted, { status: 201 })

  } catch (error) {
    console.error("[API] Create invoice error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    await connectDB()

    const url = new URL(request.url)
    const searchTerm = url.searchParams.get("search") || ""
    const startDate = url.searchParams.get("startDate") || ""
    const endDate = url.searchParams.get("endDate") || ""
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1"))
    const limit = Math.min(100, Number.parseInt(url.searchParams.get("limit") || "50")) // Max 100 per page

    const query: any = {}

    if (searchTerm) {
      query.$or = [
        { invoiceNumber: { $regex: searchTerm, $options: "i" } },
        { driverName: { $regex: searchTerm, $options: "i" } },
        { vehicleNumber: { $regex: searchTerm, $options: "i" } },
      ]
    }

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) {
        query.createdAt.$gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        query.createdAt.$lt = end
      }
    }

    const skip = (page - 1) * limit
    const invoices = await Invoice.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    const total = await Invoice.countDocuments(query)

    const formatted = invoices.map((invoice: any) => {
      invoice.id = invoice._id.toString()
      delete invoice._id
      return invoice
    })

    return NextResponse.json(formatted, {
      headers: {
        "X-Total-Count": total.toString(),
        "X-Page": page.toString(),
        "X-Limit": limit.toString(),
        "X-Total-Pages": Math.ceil(total / limit).toString(),
      },
    })
  } catch (error) {
    console.error("[API] Get invoices error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}