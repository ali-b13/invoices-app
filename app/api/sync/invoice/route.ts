import { connectDB } from "@/lib/mongodb"
import { Invoice } from "@/lib/models/Invoice"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth,checkPermission } from "../../auth/auth-helper"


export async function POST(request: NextRequest) {
  try {

    // ✅ Check authentication
    const auth = await verifyAuth(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { type, data } = await request.json()

    // ✅ Check permission based on sync type
    if (type === "create" && !checkPermission(auth.user?.permissions, "create_invoice")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    if (type === "update" && !checkPermission(auth.user?.permissions, "edit_invoice")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    if (type === "delete" && !checkPermission(auth.user?.permissions, "delete_invoice")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    await connectDB()

    // ✅ Require client-side `id`
    if (!data.id) {
      return NextResponse.json({ error: "Missing required 'id' field for sync" }, { status: 400 })
    }

    // ✅ Map client `id` → Mongo `_id`
    const cleanData = {
      ...data,
      _id: data.id,
      synced: true,
      pendingSync: false,
    }
    delete cleanData.id

    // ✅ Handle DELETE sync request
    if (type === "delete") {
      await Invoice.deleteOne({ _id: cleanData._id })
      return NextResponse.json({ success: true, id: cleanData._id })
    }

    // ✅ Look for existing document to apply conflict resolution
    const existing = await Invoice.findById(cleanData._id)

    if (existing) {
      const incomingLastModified = new Date(cleanData.lastModified).getTime()
      const existingLastModified = new Date(existing.lastModified).getTime()

      // ✅ LAST WRITE WINS (skip update if client is older)
      if (incomingLastModified < existingLastModified) {
        console.log(`[API] Sync Conflict: Skipping older update for Invoice ${cleanData._id}`)
        return NextResponse.json(existing)
      }
    }

    // ✅ Duplicate invoiceNumber protection (on create)
    if (type === "create") {
      const duplicateInvoiceNumber = await Invoice.findOne({
        invoiceNumber: cleanData.invoiceNumber,
        _id: { $ne: cleanData._id }
      })

      if (duplicateInvoiceNumber) {
        console.error(`[API] Duplicate invoiceNumber ${cleanData.invoiceNumber} detected`)
        return NextResponse.json({ error: "Duplicate invoice number detected on server." }, { status: 409 })
      }
    }

    // ✅ Upsert (Create / Update)
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      cleanData._id,
      cleanData,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    )

    return NextResponse.json(updatedInvoice)

  } catch (error) {
    console.error("[API] Invoice sync error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown server error"
    return NextResponse.json({ error: `Server error during sync: ${errorMessage}` }, { status: 500 })
  }
}
