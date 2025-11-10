import { connectDB } from "@/lib/mongodb";
import { Invoice } from "@/lib/models/Invoice";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, checkPermission } from "@/app/api/auth/auth-helper";


// ✅ POST (Create / Sync Single Invoice)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // ✅ Authentication & Permission
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!checkPermission(auth.user?.permissions, "create_invoice")) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    await connectDB();
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Missing invoice ID" },
        { status: 400 }
      );
    }

    const cleanData = {
      ...body,
      _id: id,
      synced: true,
      pendingSync: false,
      lastModified: new Date(),
    };

    const existing = await Invoice.findById(id);

    if (existing) {
      const incoming = new Date(cleanData.lastModified).getTime();
      const current = new Date(existing.lastModified).getTime();

      if (incoming <= current) {
        console.log(`[API] Invoice Sync Conflict: Skipped older update for ${id}`);
        return NextResponse.json({
          ...existing.toObject(),
          id: existing._id.toString(),
        });
      }
    }

    const saved = await Invoice.findByIdAndUpdate(id, cleanData, {
      new: true,
      upsert: true,
    });

    return NextResponse.json({
      ...saved.toObject(),
      id: saved._id.toString(),
    });
  } catch (error) {
    console.error("[API] Sync invoice error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ✅ GET invoice by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // ✅ Optional: verify that user can VIEW invoices
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!checkPermission(auth.user?.permissions, "view_invoices")) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const formatted = {
      ...invoice.toObject(),
      id: invoice._id.toString(),
    };
    delete formatted._id;

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("[API] Get invoice error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ✅ PUT (Update Invoice)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // ✅ Security & Permission
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!checkPermission(auth.user?.permissions, "edit_invoice")) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    await connectDB();
    const body = await request.json();

    const updated = await Invoice.findByIdAndUpdate(id, body, {
      new: true,
    });

    if (!updated) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    updated.id = updated._id.toString();
    delete updated._id;

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API] Update invoice error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ✅ DELETE invoice by ID
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // ✅ Security & Permission
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!checkPermission(auth.user?.permissions, "delete_invoice")) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const deleted = await Invoice.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("[API] Delete invoice error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
