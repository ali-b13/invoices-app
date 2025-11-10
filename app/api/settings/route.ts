import { connectDB } from "@/lib/mongodb";
import { Settings } from "@/lib/models/Settings";
import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth, checkPermission } from "@/app/api/auth/auth-helper"; // ✅ Ensure correct import path


const SETTINGS_ID = "global-settings";

// ✅ GET Settings
export async function GET(request: NextRequest) {
  // ✅ Auth check (only need view permission)
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await connectDB();

    let settings = await Settings.findById(SETTINGS_ID);

    if (!settings) {
      try {
        settings = await Settings.create({
          _id: SETTINGS_ID,
          defaultScale: "ميزان العبر",
          invoiceNumberFormat: "TRN-{timestamp}-{random}",
          printerPreferences: { paperSize: "A4" },
          username: "خالد صالح الديني",
          weightUnit: "kg",
          lastModified: new Date(),
          lastModifiedDevice: "server",
          synced: true,
          pendingSync: false,
        });
      } catch (createError: any) {
        if (createError.code === 11000) {
          settings = await Settings.findById(SETTINGS_ID);
          if (!settings) {
            throw new Error("Failed to create settings and could not find existing settings");
          }
        } else {
          throw createError;
        }
      }
    }

    const formatted = {
      ...settings.toObject(),
      id: settings._id.toString(),
    };
    delete formatted._id;

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("[API] Get settings error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ✅ UPDATE Settings
export async function PUT(request: NextRequest) {
  // ✅ Require Bearer Token + permission
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // ✅ Permission required: manage_permissions
  if (!checkPermission(auth.user?.permissions, "manage_permissions")) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    await connectDB();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Missing required 'id' field" },
        { status: 400 }
      );
    }

    const cleanData = {
      ...body,
      _id: body.id,
      lastModified: new Date(),
    };
    delete cleanData.id;

    const existing = await Settings.findById(cleanData._id);

    if (existing) {
      const incoming = new Date(cleanData.lastModified).getTime();
      const current = new Date(existing.lastModified).getTime();

      if (incoming <= current) {
        console.log(`[API] Settings Conflict: Skipping older update`);
        const formatted = {
          ...existing.toObject(),
          id: existing._id.toString(),
        };
        delete formatted._id;
        return NextResponse.json(formatted);
      }
    }

    const updatedSettings = await Settings.findOneAndUpdate(
      { _id: cleanData._id },
      cleanData,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    const formatted = {
      ...updatedSettings.toObject(),
      id: updatedSettings._id.toString(),
    };
    delete formatted._id;

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("[API] Update settings error:", error);

    if (error.code === 11000) {
      return NextResponse.json({ error: "Settings already exist" }, { status: 409 });
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
