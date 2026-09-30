const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      "assets/esm-CuvQyE1y.js",
      "assets/esm-BEw3THXl.js",
      "assets/dist-Ccm46aAs.js",
    ]),
) => i.map((i) => d[i]);
import { a as e, n as t, t as n } from "./jsx-runtime-DR_RMGX1.js";
import { t as i } from "./preload-helper-CElzuZtD.js";
import { a as o, o as r } from "./chunk-4ZMWKKQ3-BO2awkK2.js";
import {
  S as a,
  _ as s,
  b as d,
  c as l,
  d as c,
  g as u,
  h as m,
  m as p,
  n as f,
  p as g,
  u as h,
  v as x,
  x as b,
} from "./firebase-2D3CWueV.js";
import { n as y } from "./AuthContext-B48VO3wy.js";
import { t as S } from "./ReviewDetailsModal-Baevv3fK.js";
var j = e(t(), 1),
  w = n(),
  k = "#0891b2",
  v = (e, t) => [e, t].sort().join("_");
function R({ msg: e, isMe: t, onReviewDetails: n }) {
  return (0, w.jsxs)("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: t ? "flex-end" : "flex-start",
      marginBottom: 8,
    },
    children: [
      (0, w.jsxs)("div", {
        style: {
          background: t ? k : "white",
          color: t ? "white" : "#0f172a",
          paddingTop: "calc(44px + env(safe-area-inset-top, 0px))",
          padding: "10px 14px",
          borderRadius: t ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          fontSize: 14,
          maxWidth: 280,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          lineHeight: 1.5,
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        },
        children: [
          e.imageUrl &&
            (0, w.jsx)("img", {
              src: e.imageUrl,
              alt: "Attachment",
              style: {
                width: "100%",
                borderRadius: 12,
                marginBottom: e.text ? 8 : 0,
                border: "1px solid rgba(0,0,0,0.1)",
              },
            }),
          e.text,
          e.screenshot &&
            (0, w.jsx)("img", {
              src: e.screenshot,
              alt: "Screenshot",
              style: {
                width: "100%",
                borderRadius: 12,
                marginTop: 8,
                border: "1px solid rgba(0,0,0,0.1)",
              },
            }),
          "review_details" === e.action &&
            !t &&
            (0, w.jsx)("button", {
              onClick: () => n(e.senderId),
              style: {
                marginTop: 10,
                width: "100%",
                padding: "8px",
                background: "#e0f2fe",
                color: "#0369a1",
                border: "1px solid #bae6fd",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              },
              children: "Review Details",
            }),
        ],
      }),
      (0, w.jsx)("p", {
        style: { margin: "3px 4px 0", fontSize: 10, color: "#94a3b8" },
        children: e.timestamp?.toDate
          ? e.timestamp
              .toDate()
              .toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
          : "",
      }),
    ],
  });
}
function z() {
  const e = r(),
    t = o(),
    { user: n } = y(),
    [z, N] = (0, j.useState)("list"),
    [I, C] = (0, j.useState)([]),
    [A, T] = (0, j.useState)(null),
    [W, D] = (0, j.useState)([]),
    [$, P] = (0, j.useState)(""),
    [_, B] = (0, j.useState)(!0),
    [M, O] = (0, j.useState)("all"),
    E = (0, j.useRef)(null),
    F = (0, j.useRef)(null),
    U = (0, j.useRef)(null),
    L = (0, j.useRef)(null),
    [G, q] = (0, j.useState)(!1),
    [H, J] = (0, j.useState)([]),
    [Y, V] = (0, j.useState)(null),
    [K, Q] = (0, j.useState)(!1),
    [X, Z] = (0, j.useState)(null),
    [ee, te] = (0, j.useState)({
      roomNo: "",
      bedNo: "",
      rentAmount: "",
      dateOfJoining: new Date().toISOString().split("T")[0],
      tokenPaid: "",
      securityAmount: "",
      totalAmount: "",
      remainingAmount: "",
    }),
    [ne, ie] = (0, j.useState)(null),
    [oe, re] = (0, j.useState)(!1),
    [ae, se] = (0, j.useState)([]),
    [de, le] = (0, j.useState)(!1),
    [ce, ue] = (0, j.useState)(""),
    [me, pe] = (0, j.useState)(!1),
    [fe, ge] = (0, j.useState)(null),
    [he, xe] = (0, j.useState)(null),
    [be, ye] = (0, j.useState)(""),
    [Se, je] = (0, j.useState)(!1),
    [we, ke] = (0, j.useState)(!1),
    [ve, Re] = (0, j.useState)(!1),
    [ze, Ne] = (0, j.useState)("");
  ((0, j.useEffect)(() => {
    if (!n?.uid) return;
    (Promise.all([
      c(m(d(f, "rooms"), x("adminId", "==", n.uid))),
      c(m(d(f, "tenants"), x("adminId", "==", n.uid))),
    ]).then(([e, t]) => {
      const n = e.docs.map((e) => ({ id: e.id, ...e.data() })),
        i = t.docs.map((e) => e.data());
      se(
        n.filter((e) => {
          const t = i.filter((t) => t.roomNo === e.roomNo).length;
          return Math.max(0, (Number(e.beds) || 1) - t) > 0;
        }),
      );
    }),
      B(!0));
    (async () => {
      try {
        const e = [],
          [t, i, o, r] = await Promise.all([
            c(
              m(
                d(f, "tenants"),
                x("adminId", "==", n.uid),
                x("status", "==", "Approved"),
              ),
            ),
            c(m(d(f, "enquiries"), x("adminId", "==", n.uid))),
            c(m(d(f, "pg_applications"), x("adminId", "==", n.uid))),
            c(m(d(f, "staff_tokens"), x("ownerUid", "==", n.uid))),
          ]);
        t.forEach((t) => {
          const n = t.data();
          e.push({
            id: n.tenantId || t.id,
            name: n.name || "Student",
            role: "student",
            sub: `Room ${n.roomNo || "-"}`,
            phone: n.phone || "",
            initials: (n.name || "S").substring(0, 2).toUpperCase(),
            color: "#6366f1",
          });
        });
        const a = new Set(e.map((e) => e.id));
        (i.forEach((t) => {
          const n = t.data();
          a.has(n.tenantId) ||
            (a.add(n.tenantId),
            e.push({
              id: n.tenantId || t.id,
              name: n.tenantName || "Enquiry",
              role: "enquiry",
              sub: n.pgName || "Enquiry Lead",
              phone: n.tenantPhone || "",
              initials: (n.tenantName || "E").substring(0, 2).toUpperCase(),
              color: "#ec4899",
            }));
        }),
          o.forEach((t) => {
            const n = t.data();
            a.has(n.tenantId) ||
              (a.add(n.tenantId),
              e.push({
                id: n.tenantId || t.id,
                name: n.tenantName || "Applicant",
                role: "enquiry",
                sub: `Applied for ${n.pgName || "PG"}`,
                phone: n.tenantPhone || "",
                initials: (n.tenantName || "A").substring(0, 2).toUpperCase(),
                color: "#f59e0b",
              }));
          }),
          r.forEach((t) => {
            const n = t.data();
            e.push({
              id: t.id,
              name: n.name || "Staff",
              role: "staff",
              sub: n.role || "Staff",
              phone: n.phone || "",
              initials: (n.name || "S").substring(0, 2).toUpperCase(),
              color: "#8b5cf6",
            });
          }),
          C(e));
      } catch (e) {
        console.error("Error loading contacts:", e);
      } finally {
        B(!1);
      }
    })();
  }, [n]),
    (0, j.useEffect)(() => {
      if (t.state && (t.state.contactId || t.state.name) && I.length > 0) {
        const e = I.find(
          (e) =>
            (t.state.contactId && e.id === t.state.contactId) ||
            (t.state.name &&
              e.name.toLowerCase() === t.state.name.toLowerCase()),
        );
        e
          ? Ie(e)
          : t.state.contactId &&
            Ie({
              id: t.state.contactId,
              name: t.state.name || "Contact",
              role: "enquiry",
              sub: "New Chat",
              phone: t.state.phone || "",
              initials: (t.state.name || "C").substring(0, 2).toUpperCase(),
              color: "#0891b2",
            });
      }
    }, [t.state, I]));
  const Ie = (e) => {
    if (
      (T(e),
      N("chat"),
      D([]),
      ge(null),
      Q(!1),
      F.current && (F.current(), (F.current = null)),
      U.current && (U.current(), (U.current = null)),
      L.current && (L.current(), (L.current = null)),
      !n?.uid || !e.id)
    )
      return;
    const t = v(n.uid, e.id);
    ((F.current = g(
      m(d(f, "chats", t, "messages"), p("timestamp", "asc")),
      (e) => {
        const t = e.docs.map((e) => {
          const t = e.data({ serverTimestampBehavior: "estimate" });
          return { id: e.id, ...t };
        });
        (t.sort((e, t) => {
          const n = (e) =>
            e
              ? e.toMillis
                ? e.toMillis()
                : "string" == typeof e
                  ? new Date(e).getTime()
                  : Date.now()
              : Date.now();
          return n(e.timestamp) - n(t.timestamp);
        }),
          D(t));
      },
    )),
      (U.current = g(b(f, "chats", t), (e) => {
        if (e.exists()) {
          const t = e.data();
          (ge(t.demandedToken || null),
            Q(void 0 !== t.tokenPaid && null !== t.tokenPaid));
        } else (ge(null), Q(!1));
      })),
      (L.current = g(b(f, "tenants", e.id), (e) => {
        le(e.exists());
      })));
  };
  ((0, j.useEffect)(() => {
    E.current?.scrollIntoView({ behavior: "smooth" });
  }, [W]),
    (0, j.useEffect)(
      () => () => {
        (F.current && F.current(),
          U.current && U.current(),
          L.current && L.current());
      },
      [],
    ));
  const Ce = async () => {
      try {
        const e = await h(b(f, "pg_owners", n.uid));
        if (e.exists()) {
          const t = e.data().propertyDetails?.rents || [];
          (J(t), V(t.length > 0 ? t[0] : null));
        } else (J([]), V(null));
      } catch (e) {
        console.error("Error fetching PG rents:", e);
      }
      (ue(""), q(!0));
    },
    Ae = async () => {
      if (!Y) return ye("Please select a seater type");
      if (!ce || isNaN(ce) || Number(ce) < 0)
        return ye("Please enter a valid security amount");
      const e = Number(Y.rent),
        t = Number(ce),
        i = e + t;
      pe(!0);
      try {
        const o = v(n.uid, A.id),
          r = {
            seater: Y.seater,
            seaterLabel: `${Y.seater} Seater Room`,
            rent: e,
            security: t,
            totalAmount: i,
            sentAt: new Date().toISOString(),
            sentByAdminId: n.uid,
          };
        (await u(
          b(f, "chats", o),
          {
            participants: [n.uid, A.id],
            adminId: n.uid,
            tenantId: A.id,
            demandedToken: r,
            lastMessage: `Room Offer: ${Y.seater} Seater · ₹${e}/mo + ₹${t} security`,
            lastTimestamp: a(),
          },
          { merge: !0 },
        ),
          await l(d(f, "chats", o, "messages"), {
            text: `🏠 Room Offer Sent\n${Y.seater} Seater Room\nMonthly Rent: ₹${e}\nSecurity Deposit: ₹${t}\nTotal First Month: ₹${i}\n\nPlease pay the token amount to confirm your room.`,
            senderId: n.uid,
            senderName: n.name || "Admin",
            timestamp: a(),
            read: !1,
            isSystem: !0,
          }),
          await l(d(f, "users", A.id, "notifications"), {
            title: "Room Offer from PG Admin",
            desc: `Your PG admin has offered a ${Y.seater} Seater room at ₹${e}/month + ₹${t} security. Open chat to pay token.`,
            type: "info",
            action: "OPEN_CHAT",
            unread: !0,
            createdAt: new Date().toISOString(),
          }),
          ge(r),
          q(!1),
          ye("Room offer sent to student successfully!"));
      } catch (o) {
        (console.error("Error sending demand:", o),
          ye("Failed to send room offer."));
      } finally {
        pe(!1);
      }
    },
    Te = async () => {
      ie("sending_details");
      try {
        const e = n.uid < A.id ? `${n.uid}_${A.id}` : `${A.id}_${n.uid}`,
          t = (await h(b(f, "pg_owners", n.uid))).data() || {},
          i = t.foodMenu || t.foodTimetable;
        if (!i)
          return (alert("No Mess Menu found for your PG."), void ie(null));
        let o = "🍽️ *Weekly Mess Menu*\n\n";
        ([
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ].forEach((e) => {
          const t = Object.keys(i).find(
            (t) => t.toLowerCase() === e.toLowerCase(),
          );
          t &&
            i[t] &&
            ((o += `*__${e}__*\n`),
            i[t].breakfast && (o += `☕ Breakfast: ${i[t].breakfast}\n`),
            i[t].lunch && (o += `🍛 Lunch: ${i[t].lunch}\n`),
            i[t].snacks && (o += `🥪 Snacks: ${i[t].snacks}\n`),
            i[t].dinner && (o += `🍲 Dinner: ${i[t].dinner}\n`),
            (o += "\n"));
        }),
          "🍽️ *Weekly Mess Menu*\n\n" === o &&
            (o += "Menu is currently empty."),
          await l(d(f, "chats", e, "messages"), {
            text: o.trim(),
            senderId: n.uid,
            timestamp: new Date().toISOString(),
          }),
          await u(
            b(f, "chats", e),
            {
              lastMessage: "Sent Mess Menu",
              lastTimestamp: new Date().toISOString(),
            },
            { merge: !0 },
          ),
          ke(!1));
      } catch (e) {
        (console.error(e), alert("Failed to send mess menu"));
      }
      ie(null);
    },
    We = async () => {
      ie("sending_details");
      try {
        const e = n.uid < A.id ? `${n.uid}_${A.id}` : `${A.id}_${n.uid}`,
          t = (await h(b(f, "pg_owners", n.uid))).data();
        if (!t) return (alert("No PG Details found."), void ie(null));
        let i = "—";
        t.propertyDetails?.rents?.length &&
          (i = `₹${Math.min(...t.propertyDetails.rents.map((e) => Number(e.rent)).filter((e) => e > 0)).toLocaleString()}/mo`);
        let o = `🏢 *${t.pgName || "Febebo PG"}*\n`;
        ((o += `📍 ${t.location?.city || "New Delhi"}\n`),
          (o += `🏷️ Starting at: ${i}\n\n`),
          t.amenities &&
            t.amenities.length > 0 &&
            (o += `✨ Amenities: ${t.amenities.join(", ")}\n`));
        const r =
          t.images && t.images.length > 0 ? t.images[0] : t.image || null;
        (await l(d(f, "chats", e, "messages"), {
          text: o.trim(),
          imageUrl: r,
          senderId: n.uid,
          timestamp: new Date().toISOString(),
        }),
          await u(
            b(f, "chats", e),
            {
              lastMessage: "Sent PG Details",
              lastTimestamp: new Date().toISOString(),
            },
            { merge: !0 },
          ),
          ke(!1));
      } catch (e) {
        (console.error(e), alert("Failed to send PG details"));
      }
      ie(null);
    },
    De = async () => {
      if (!A) return;
      (re(!0), Z(A));
      let e = "",
        t = "",
        i = "",
        o = "",
        r = "";
      if (A && n?.uid)
        try {
          const s = [n.uid, A.id].sort().join("_"),
            l = n.uid > A.id ? n.uid + "_" + A.id : A.id + "_" + n.uid;
          let u = await h(b(f, "chats", s));
          u.exists() || s === l || (u = await h(b(f, "chats", l)));
          let g = !1;
          if (u.exists()) {
            const n = u.data();
            void 0 !== n.tokenPaid && null !== n.tokenPaid
              ? ((t = n.tokenPaid),
                (e = n.rentAmount || n.demandedToken?.rent || ""),
                (i = n.securityAmount || n.demandedToken?.security || ""),
                (o = n.totalAmount || n.demandedToken?.totalAmount || ""),
                (r = n.remainingAmount || ""),
                (g = !0))
              : n.demandedToken &&
                ((e = n.demandedToken.rent || ""),
                (i = n.demandedToken.security || ""),
                (o = n.demandedToken.totalAmount || ""),
                (t = 0));
          }
          if (!g)
            try {
              (
                await c(
                  m(
                    d(f, "chats", u.id, "messages"),
                    p("timestamp", "desc"),
                    limit(20),
                  ),
                )
              ).forEach((n) => {
                const o = n.data();
                if (
                  o.isSystem &&
                  o.text &&
                  o.text.includes("Token Payment Logged") &&
                  !g
                ) {
                  const n = o.text.match(/Token Paid:\s*₹(\d+)/);
                  n && ((t = Number(n[1])), (g = !0));
                  const r = o.text.match(/Rent:\s*₹(\d+)/);
                  r && !e && (e = Number(r[1]));
                  const a = o.text.match(/Security:\s*₹(\d+)/);
                  a && !i && (i = Number(a[1]));
                }
              });
            } catch (a) {
              console.error("Error fetching older messages for token", a);
            }
        } catch (s) {
          console.error("Error fetching chat data for allotment", s);
        }
      (te({
        roomNo: "",
        rentAmount: e,
        tokenPaid: t,
        securityAmount: i,
        totalAmount: o,
        remainingAmount: r,
        dateOfJoining: new Date().toISOString().split("T")[0],
      }),
        re(!1));
    },
    $e = async (e) => {
      if ((e.preventDefault(), !ee.roomNo || !ee.rentAmount))
        return ye("Please fill all fields");
      ie("approving");
      const t = A.id,
        i = A.name || "Unknown",
        o = A.phone || A.mobile || "";
      try {
        try {
          await s(b(f, "pg_applications", t), { status: "approved" });
        } catch (e) {}
        try {
          await s(b(f, "enquiries", t), { enquiryStatus: "Closed" });
        } catch (e) {}
        const r = Number(ee.rentAmount),
          c = Number(ee.tokenPaid) || 0,
          m = Number(ee.securityAmount) || 0,
          p = Number(ee.totalAmount) || r + m,
          g = Number(ee.remainingAmount) || p - c;
        let x = null,
          y = null;
        try {
          const e = await h(b(f, "users", t));
          e.exists() &&
            ((x = e.data().kyc || null),
            (y = e.data().kyc?.profilePhoto || e.data().photoURL || null));
        } catch (e) {}
        await u(
          b(f, "tenants", t),
          {
            tenantId: t,
            adminId: n.uid,
            name: i,
            phone: o,
            roomNo: ee.roomNo,
            bedNo: ee.bedNo,
            rentAmount: r,
            tokenPaid: c,
            securityDeposit: m,
            totalAmount: p,
            remainingAmount: g,
            dateOfJoining: ee.dateOfJoining,
            status: "Upcoming User",
            plan: "Monthly",
            paymentStatus: "Pending",
            ...(x ? { kyc: x } : {}),
            ...(y ? { image: y } : {}),
          },
          { merge: !0 },
        );
        try {
          await s(b(f, "users", t), {
            "subscribedPG.roomNo": ee.roomNo,
            "subscribedPG.bedNo": ee.bedNo,
          });
        } catch (e) {
          console.warn(e);
        }
        (await s(b(f, "users", t), {
          subscribedPG: {
            pgId: n.uid,
            pgName: "Your PG",
            roomNo: ee.roomNo,
            bedNo: ee.bedNo,
            leaseAmount: r,
            securityAmount: m,
            tokenPaid: c,
            totalAmount: p,
            remainingAmount: g,
            status: "Upcoming User",
          },
        }),
          await l(d(f, "users", t, "notifications"), {
            title: "🎉 Room Allotted!",
            desc: `You have been allotted Room ${ee.roomNo}${ee.bedNo ? ` (Bed ${ee.bedNo})` : ""}. Please check your Upcoming Dashboard to clear the balance.`,
            type: "success",
            action: "VISIT_DASHBOARD",
            unread: !0,
            createdAt: new Date().toISOString(),
          }));
        const S = v(n.uid, t);
        (await u(
          b(f, "chats", S),
          {
            lastMessage: `🎉 Room Allotted: ${ee.roomNo}${ee.bedNo ? ` (Bed ${ee.bedNo})` : ""}`,
            lastTimestamp: a(),
          },
          { merge: !0 },
        ),
          await l(d(f, "chats", S, "messages"), {
            senderId: n.uid,
            text: `🎉 Room Allotted!\n\nRoom No: ${ee.roomNo}\nBed No: ${ee.bedNo || "N/A"}\nRent: ₹${r}\nSecurity: ₹${m}\nToken Paid: ₹${c}\nRemaining: ₹${g}`,
            timestamp: a(),
            isSystem: !0,
          }),
          Z(null),
          te({
            roomNo: "",
            rentAmount: "",
            dateOfJoining: new Date().toISOString().split("T")[0],
            tokenPaid: "",
          }),
          ye("Room Allotted successfully!"));
      } catch (r) {
        (console.error("Error approving:", r),
          ye("Failed to allot room: " + r.message));
      } finally {
        ie(null);
      }
    },
    Pe = async () => {
      if (!$.trim() || !A || !n?.uid) return;
      const e = v(n.uid, A.id),
        t = $.trim();
      P("");
      try {
        await Promise.all([
          u(
            b(f, "chats", e),
            {
              participants: [n.uid, A.id],
              lastMessage: t,
              lastTimestamp: a(),
              adminId: n.uid,
              tenantId: A.id,
            },
            { merge: !0 },
          ),
          l(d(f, "chats", e, "messages"), {
            text: t,
            senderId: n.uid,
            senderName: n.name || "Admin",
            timestamp: a(),
            read: !1,
          }),
        ]);
      } catch (i) {
        console.error("Error sending message:", i);
      }
    },
    _e = async (e) => {
      if (!A || !n?.uid) return;
      const t = v(n.uid, A.id);
      try {
        await Promise.all([
          u(
            b(f, "chats", t),
            {
              participants: [n.uid, A.id],
              lastMessage: "📷 Image",
              lastTimestamp: a(),
              adminId: n.uid,
              tenantId: A.id,
            },
            { merge: !0 },
          ),
          l(d(f, "chats", t, "messages"), {
            text: "",
            screenshot: e,
            senderId: n.uid,
            senderName: n.name || "Admin",
            timestamp: a(),
            read: !1,
          }),
        ]);
      } catch (i) {
        console.error("Error sending media:", i);
      }
    },
    Be = I.filter(
      (e) =>
        "all" === M ||
        ("student" === M
          ? "student" === e.role
          : "enquiry" === M
            ? "enquiry" === e.role
            : "staff" !== M || "staff" === e.role),
    ),
    Me = { student: "#6366f1", enquiry: "#ec4899", staff: "#8b5cf6" };
  if ("chat" === z && A) {
    const e = Y ? Number(Y.rent) : 0,
      t = Number(ce) || 0,
      o = e + t;
    return (0, w.jsxs)("div", {
      style: {
        maxWidth: 480,
        margin: "0 auto",
        height: "100vh",
        background: "#f1f5f9",
        fontFamily: "'Hanken Grotesk', sans-serif",
        display: "flex",
        flexDirection: "column",
      },
      children: [
        be &&
          (0, w.jsxs)("div", {
            style: {
              position: "fixed",
              inset: 0,
              zIndex: 1e3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
            children: [
              (0, w.jsx)("div", {
                onClick: () => ye(""),
                style: {
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.55)",
                },
              }),
              (0, w.jsxs)("div", {
                style: {
                  background: "white",
                  borderRadius: 20,
                  padding: 24,
                  width: "90%",
                  maxWidth: 340,
                  position: "relative",
                  zIndex: 1,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  textAlign: "center",
                },
                children: [
                  (0, w.jsx)("div", {
                    style: {
                      background: "#0891b2",
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                    },
                    children: (0, w.jsxs)("svg", {
                      width: "24",
                      height: "24",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "white",
                      strokeWidth: "2",
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      children: [
                        (0, w.jsx)("path", {
                          d: "M22 11.08V12a10 10 0 1 1-5.93-9.14",
                        }),
                        (0, w.jsx)("polyline", {
                          points: "22 4 12 14.01 9 11.01",
                        }),
                      ],
                    }),
                  }),
                  (0, w.jsx)("h3", {
                    style: {
                      margin: "0 0 8px",
                      fontSize: 18,
                      color: "#0891b2",
                    },
                    children: "Notification",
                  }),
                  (0, w.jsx)("p", {
                    style: {
                      margin: "0 0 24px",
                      fontSize: 14,
                      color: "#475569",
                      lineHeight: 1.5,
                    },
                    children: be,
                  }),
                  (0, w.jsx)("button", {
                    onClick: () => ye(""),
                    style: {
                      width: "100%",
                      padding: "12px",
                      background: "#0891b2",
                      border: "none",
                      borderRadius: 12,
                      fontWeight: 700,
                      color: "white",
                      cursor: "pointer",
                    },
                    children: "Done",
                  }),
                ],
              }),
            ],
          }),
        X &&
          (0, w.jsx)("div", {
            style: {
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 1e5,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            },
            onClick: () => Z(null),
            children: (0, w.jsxs)("div", {
              style: {
                background: "white",
                width: "100%",
                maxWidth: 500,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: "24px",
                boxSizing: "border-box",
                animation: "slideUp 0.3s ease-out",
                maxHeight: "90vh",
                overflowY: "auto",
              },
              onClick: (e) => e.stopPropagation(),
              children: [
                (0, w.jsxs)("div", {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  },
                  children: [
                    (0, w.jsx)("p", {
                      style: {
                        fontFamily: "'Bricolage Grotesque',sans-serif",
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#0f172a",
                        margin: 0,
                      },
                      children: "Allot Room",
                    }),
                    (0, w.jsx)("button", {
                      onClick: () => Z(null),
                      style: {
                        background: "#f1f5f9",
                        border: "none",
                        borderRadius: "50%",
                        width: 32,
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748b",
                        cursor: "pointer",
                      },
                      children: (0, w.jsx)("span", {
                        className: "material-symbols-outlined",
                        style: { fontSize: 18 },
                        children: "close",
                      }),
                    }),
                  ],
                }),
                oe
                  ? (0, w.jsxs)("div", {
                      style: {
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "40px 0",
                        gap: 16,
                      },
                      children: [
                        (0, w.jsx)("div", {
                          style: {
                            width: 48,
                            height: 48,
                            border: "4px solid #e2e8f0",
                            borderTop: "4px solid #0891b2",
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                          },
                        }),
                        (0, w.jsx)("p", {
                          style: {
                            margin: 0,
                            fontSize: 14,
                            color: "#64748b",
                            fontWeight: 600,
                          },
                          children: "Fetching payment data from chat...",
                        }),
                        (0, w.jsx)("style", {
                          children:
                            "@keyframes spin { to { transform: rotate(360deg); } }",
                        }),
                      ],
                    })
                  : (0, w.jsx)(w.Fragment, {
                      children: (0, w.jsxs)("form", {
                        onSubmit: $e,
                        children: [
                          (0, w.jsxs)("div", {
                            style: { marginBottom: 16 },
                            children: [
                              (0, w.jsx)("label", {
                                style: {
                                  display: "block",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "#64748b",
                                  marginBottom: 8,
                                  textTransform: "uppercase",
                                },
                                children: "Select Room *",
                              }),
                              (0, w.jsxs)("select", {
                                value: ee.roomNo,
                                onChange: (e) =>
                                  te((t) => ({ ...t, roomNo: e.target.value })),
                                style: {
                                  width: "100%",
                                  padding: "14px",
                                  borderRadius: 12,
                                  border: "1px solid #e2e8f0",
                                  background: "#f8fafc",
                                  fontSize: 15,
                                  fontFamily: "inherit",
                                  outline: "none",
                                },
                                required: !0,
                                children: [
                                  (0, w.jsx)("option", {
                                    value: "",
                                    children: "Choose a room...",
                                  }),
                                  ae.map((e) =>
                                    (0, w.jsxs)(
                                      "option",
                                      {
                                        value: e.roomNo,
                                        children: ["Room ", e.roomNo],
                                      },
                                      e.id,
                                    ),
                                  ),
                                ],
                              }),
                            ],
                          }),
                          (0, w.jsxs)("div", {
                            style: { marginBottom: 16 },
                            children: [
                              (0, w.jsx)("label", {
                                style: {
                                  display: "block",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "#64748b",
                                  marginBottom: 8,
                                  textTransform: "uppercase",
                                },
                                children: "Bed Number",
                              }),
                              (0, w.jsx)("input", {
                                type: "text",
                                placeholder: "e.g. Bed 1, A, etc.",
                                value: ee.bedNo,
                                onChange: (e) =>
                                  te((t) => ({ ...t, bedNo: e.target.value })),
                                style: {
                                  width: "100%",
                                  padding: "14px",
                                  borderRadius: 12,
                                  border: "1px solid #e2e8f0",
                                  background: "#f8fafc",
                                  fontSize: 15,
                                  fontFamily: "inherit",
                                  outline: "none",
                                  boxSizing: "border-box",
                                },
                              }),
                            ],
                          }),
                          (0, w.jsxs)("div", {
                            style: { marginBottom: 16 },
                            children: [
                              (0, w.jsx)("label", {
                                style: {
                                  display: "block",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "#64748b",
                                  marginBottom: 8,
                                  textTransform: "uppercase",
                                },
                                children: "Monthly Rent (₹) *",
                              }),
                              (0, w.jsx)("input", {
                                type: "number",
                                value: ee.rentAmount,
                                readOnly: !0,
                                style: {
                                  width: "100%",
                                  padding: "14px",
                                  borderRadius: 12,
                                  border: "1px solid #cbd5e1",
                                  background: "#e2e8f0",
                                  color: "#475569",
                                  fontSize: 15,
                                  fontFamily: "inherit",
                                  outline: "none",
                                  boxSizing: "border-box",
                                  fontWeight: 600,
                                },
                                required: !0,
                              }),
                            ],
                          }),
                          (0, w.jsxs)("div", {
                            style: { marginBottom: 16 },
                            children: [
                              (0, w.jsx)("label", {
                                style: {
                                  display: "block",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "#64748b",
                                  marginBottom: 8,
                                  textTransform: "uppercase",
                                },
                                children: "Security Deposit (₹)",
                              }),
                              (0, w.jsx)("input", {
                                type: "number",
                                value: ee.securityAmount,
                                readOnly: !0,
                                style: {
                                  width: "100%",
                                  padding: "14px",
                                  borderRadius: 12,
                                  border: "1px solid #cbd5e1",
                                  background: "#e2e8f0",
                                  color: "#475569",
                                  fontSize: 15,
                                  fontFamily: "inherit",
                                  outline: "none",
                                  boxSizing: "border-box",
                                  fontWeight: 600,
                                },
                              }),
                            ],
                          }),
                          (0, w.jsxs)("div", {
                            style: { marginBottom: 16 },
                            children: [
                              (0, w.jsx)("label", {
                                style: {
                                  display: "block",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "#64748b",
                                  marginBottom: 8,
                                  textTransform: "uppercase",
                                },
                                children: "Token Amount Paid (₹)",
                              }),
                              (0, w.jsx)("input", {
                                type: "number",
                                value: ee.tokenPaid,
                                readOnly: !0,
                                style: {
                                  width: "100%",
                                  padding: "14px",
                                  borderRadius: 12,
                                  border: "1px solid #cbd5e1",
                                  background: "#e2e8f0",
                                  color: "#475569",
                                  fontSize: 15,
                                  fontFamily: "inherit",
                                  outline: "none",
                                  boxSizing: "border-box",
                                  fontWeight: 600,
                                },
                              }),
                            ],
                          }),
                          (0, w.jsxs)("div", {
                            style: { marginBottom: 24 },
                            children: [
                              (0, w.jsx)("label", {
                                style: {
                                  display: "block",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "#64748b",
                                  marginBottom: 8,
                                  textTransform: "uppercase",
                                },
                                children: "Date of Joining",
                              }),
                              (0, w.jsx)("input", {
                                type: "date",
                                value: ee.dateOfJoining,
                                onChange: (e) =>
                                  te((t) => ({
                                    ...t,
                                    dateOfJoining: e.target.value,
                                  })),
                                style: {
                                  width: "100%",
                                  padding: "14px",
                                  borderRadius: 12,
                                  border: "1px solid #e2e8f0",
                                  background: "#f8fafc",
                                  fontSize: 15,
                                  fontFamily: "inherit",
                                  outline: "none",
                                  boxSizing: "border-box",
                                },
                                required: !0,
                              }),
                            ],
                          }),
                          (0, w.jsx)("button", {
                            type: "submit",
                            disabled: "approving" === ne,
                            style: {
                              width: "100%",
                              padding: "16px",
                              background: "#0891b2",
                              color: "white",
                              border: "none",
                              borderRadius: 16,
                              fontWeight: 800,
                              fontSize: 16,
                              cursor: ne ? "not-allowed" : "pointer",
                              opacity: ne ? 0.7 : 1,
                            },
                            children:
                              "approving" === ne
                                ? "Approving..."
                                : "Confirm & Allot Room",
                          }),
                        ],
                      }),
                    }),
              ],
            }),
          }),
        we &&
          (0, w.jsxs)("div", {
            style: {
              position: "fixed",
              inset: 0,
              zIndex: 200,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: 20,
            },
            children: [
              (0, w.jsx)("div", {
                onClick: () => ke(!1),
                style: {
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.55)",
                },
              }),
              (0, w.jsxs)("div", {
                style: {
                  position: "relative",
                  background: "white",
                  borderRadius: 24,
                  padding: 24,
                  zIndex: 201,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                },
                children: [
                  (0, w.jsx)("h3", {
                    style: {
                      margin: "0 0 16px",
                      fontSize: 20,
                      color: "#0f172a",
                      fontWeight: 800,
                    },
                    children: "📤 Send Details",
                  }),
                  (0, w.jsxs)("div", {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    },
                    children: [
                      (0, w.jsxs)("button", {
                        onClick: () => {
                          (ke(!1), Re(!0));
                        },
                        style: {
                          padding: "16px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 16,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          cursor: "pointer",
                          textAlign: "left",
                        },
                        children: [
                          (0, w.jsx)("div", {
                            style: {
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              background: "#eff6ff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#2563eb",
                            },
                            children: (0, w.jsx)("span", {
                              className: "material-symbols-outlined",
                              children: "bed",
                            }),
                          }),
                          (0, w.jsxs)("div", {
                            children: [
                              (0, w.jsx)("h4", {
                                style: {
                                  margin: "0 0 4px",
                                  fontSize: 16,
                                  fontWeight: 700,
                                  color: "#0f172a",
                                },
                                children: "Room Details",
                              }),
                              (0, w.jsx)("p", {
                                style: {
                                  margin: 0,
                                  fontSize: 13,
                                  color: "#64748b",
                                },
                                children: "Select a room and send its details",
                              }),
                            ],
                          }),
                        ],
                      }),
                      (0, w.jsxs)("button", {
                        onClick: Te,
                        disabled: "sending_details" === ne,
                        style: {
                          padding: "16px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 16,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          cursor: "pointer",
                          textAlign: "left",
                          opacity: "sending_details" === ne ? 0.7 : 1,
                        },
                        children: [
                          (0, w.jsx)("div", {
                            style: {
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              background: "#fffbeb",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#d97706",
                            },
                            children: (0, w.jsx)("span", {
                              className: "material-symbols-outlined",
                              children: "restaurant",
                            }),
                          }),
                          (0, w.jsxs)("div", {
                            children: [
                              (0, w.jsx)("h4", {
                                style: {
                                  margin: "0 0 4px",
                                  fontSize: 16,
                                  fontWeight: 700,
                                  color: "#0f172a",
                                },
                                children: "Mess Menu",
                              }),
                              (0, w.jsx)("p", {
                                style: {
                                  margin: 0,
                                  fontSize: 13,
                                  color: "#64748b",
                                },
                                children: "Send weekly food timetable",
                              }),
                            ],
                          }),
                        ],
                      }),
                      (0, w.jsxs)("button", {
                        onClick: We,
                        disabled: "sending_details" === ne,
                        style: {
                          padding: "16px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 16,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          cursor: "pointer",
                          textAlign: "left",
                          opacity: "sending_details" === ne ? 0.7 : 1,
                        },
                        children: [
                          (0, w.jsx)("div", {
                            style: {
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              background: "#f0fdf4",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#16a34a",
                            },
                            children: (0, w.jsx)("span", {
                              className: "material-symbols-outlined",
                              children: "apartment",
                            }),
                          }),
                          (0, w.jsxs)("div", {
                            children: [
                              (0, w.jsx)("h4", {
                                style: {
                                  margin: "0 0 4px",
                                  fontSize: 16,
                                  fontWeight: 700,
                                  color: "#0f172a",
                                },
                                children: "PG Details",
                              }),
                              (0, w.jsx)("p", {
                                style: {
                                  margin: 0,
                                  fontSize: 13,
                                  color: "#64748b",
                                },
                                children: "Send PG info and cover image",
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                  (0, w.jsx)("button", {
                    onClick: () => ke(!1),
                    style: {
                      width: "100%",
                      marginTop: 20,
                      padding: 14,
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "none",
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: "pointer",
                    },
                    children: "Cancel",
                  }),
                ],
              }),
            ],
          }),
        ve &&
          (0, w.jsxs)("div", {
            style: {
              position: "fixed",
              inset: 0,
              zIndex: 200,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: 20,
            },
            children: [
              (0, w.jsx)("div", {
                onClick: () => Re(!1),
                style: {
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.55)",
                },
              }),
              (0, w.jsxs)("div", {
                style: {
                  position: "relative",
                  background: "white",
                  borderRadius: 24,
                  padding: 24,
                  zIndex: 201,
                  maxHeight: "90vh",
                  overflowY: "auto",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                },
                children: [
                  (0, w.jsx)("h3", {
                    style: {
                      margin: "0 0 4px",
                      fontSize: 20,
                      color: "#0f172a",
                      fontWeight: 800,
                    },
                    children: "🛏️ Send Room Details",
                  }),
                  (0, w.jsxs)("p", {
                    style: {
                      margin: "0 0 20px",
                      fontSize: 13,
                      color: "#64748b",
                    },
                    children: [
                      "Select a room to send its details to ",
                      (0, w.jsx)("strong", { children: A.name }),
                      ".",
                    ],
                  }),
                  (0, w.jsxs)("select", {
                    value: ze,
                    onChange: (e) => Ne(e.target.value),
                    style: {
                      width: "100%",
                      padding: "14px",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: 15,
                      fontFamily: "inherit",
                      outline: "none",
                      marginBottom: 20,
                    },
                    children: [
                      (0, w.jsx)("option", {
                        value: "",
                        children: "Select a room...",
                      }),
                      ae.map((e) =>
                        (0, w.jsxs)(
                          "option",
                          {
                            value: e.id,
                            children: [
                              "Room ",
                              e.roomNo,
                              " - ",
                              e.roomType || "Standard Room",
                              " (",
                              e.beds || e.roomBeds || 1,
                              " Seater)",
                            ],
                          },
                          e.id,
                        ),
                      ),
                    ],
                  }),
                  (0, w.jsxs)("div", {
                    style: { display: "flex", gap: 12 },
                    children: [
                      (0, w.jsx)("button", {
                        onClick: () => Re(!1),
                        style: {
                          flex: 1,
                          padding: 14,
                          background: "#f1f5f9",
                          color: "#475569",
                          border: "none",
                          borderRadius: 12,
                          fontWeight: 700,
                          fontSize: 15,
                          cursor: "pointer",
                        },
                        children: "Cancel",
                      }),
                      (0, w.jsx)("button", {
                        onClick: () => {
                          if (!ze) return alert("Please select a room");
                          (async (e) => {
                            ie("sending_details");
                            const t = ae.find((t) => t.id === e);
                            if (t) {
                              try {
                                const e = `Room No: ${t.roomNo}\nType: ${t.roomType || "Standard Room"} (${t.beds || t.roomBeds || 1} Seater)\nBeds: ${t.bedNumbers || "N/A"}`,
                                  i = {
                                    senderId: n.uid,
                                    senderName: n.name || "Admin",
                                    text: `Here are the details for Room ${t.roomNo}:\n\n${e}`,
                                    timestamp: new Date().toISOString(),
                                    read: !1,
                                  };
                                t.image &&
                                  ((i.imageUrl = t.image),
                                  (i.imageName = `Room_${t.roomNo}_image`));
                                const o =
                                  n.uid < A.id
                                    ? `${n.uid}_${A.id}`
                                    : `${A.id}_${n.uid}`;
                                (await l(d(f, "chats", o, "messages"), i),
                                  await u(
                                    b(f, "chats", o),
                                    {
                                      lastMessage: `Sent details for Room ${t.roomNo}`,
                                      lastTimestamp: new Date().toISOString(),
                                    },
                                    { merge: !0 },
                                  ),
                                  Re(!1),
                                  Ne(""),
                                  E.current &&
                                    E.current.scrollIntoView({
                                      behavior: "smooth",
                                    }));
                              } catch (i) {
                                (console.error(
                                  "Error sending room details:",
                                  i,
                                ),
                                  alert("Failed to send room details"));
                              }
                              ie(null);
                            } else ie(null);
                          })(ze);
                        },
                        disabled: "sending_details" === ne,
                        style: {
                          flex: 1,
                          padding: 14,
                          background: "#0891b2",
                          color: "white",
                          border: "none",
                          borderRadius: 12,
                          fontWeight: 700,
                          fontSize: 15,
                          cursor: "pointer",
                          opacity: "sending_details" === ne ? 0.7 : 1,
                        },
                        children:
                          "sending_details" === ne ? "Sending..." : "Send",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        G &&
          (0, w.jsxs)("div", {
            style: {
              position: "fixed",
              inset: 0,
              zIndex: 200,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: 20,
            },
            children: [
              (0, w.jsx)("div", {
                onClick: () => q(!1),
                style: {
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.55)",
                },
              }),
              (0, w.jsxs)("div", {
                style: {
                  position: "relative",
                  background: "white",
                  borderRadius: 24,
                  padding: 24,
                  zIndex: 201,
                  maxHeight: "90vh",
                  overflowY: "auto",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                },
                children: [
                  (0, w.jsx)("h3", {
                    style: {
                      margin: "0 0 4px",
                      fontSize: 20,
                      color: "#0f172a",
                      fontWeight: 800,
                    },
                    children: "🏠 Demand Token Amount",
                  }),
                  (0, w.jsxs)("p", {
                    style: {
                      margin: "0 0 20px",
                      fontSize: 13,
                      color: "#64748b",
                    },
                    children: [
                      "Select the room type for ",
                      (0, w.jsx)("strong", { children: A.name }),
                      " and set the security amount.",
                    ],
                  }),
                  (0, w.jsx)("label", {
                    style: {
                      display: "block",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 8,
                    },
                    children: "Seater Preference",
                  }),
                  0 === H.length
                    ? (0, w.jsx)("div", {
                        style: {
                          background: "#fef9c3",
                          borderRadius: 12,
                          padding: 14,
                          marginBottom: 16,
                          border: "1px solid #fde68a",
                        },
                        children: (0, w.jsx)("p", {
                          style: { margin: 0, fontSize: 13, color: "#92400e" },
                          children:
                            "⚠️ No rent rates found. Please add rent rates in your PG profile first.",
                        }),
                      })
                    : (0, w.jsx)("div", {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          marginBottom: 16,
                        },
                        children: H.map((e, t) =>
                          (0, w.jsxs)(
                            "div",
                            {
                              onClick: () => V(e),
                              style: {
                                padding: "12px 16px",
                                borderRadius: 12,
                                cursor: "pointer",
                                transition: "all 0.2s",
                                border:
                                  Y?.seater === e.seater
                                    ? "2px solid #0891b2"
                                    : "2px solid #e2e8f0",
                                background:
                                  Y?.seater === e.seater ? "#f0f9ff" : "white",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              },
                              children: [
                                (0, w.jsxs)("div", {
                                  children: [
                                    (0, w.jsxs)("p", {
                                      style: {
                                        margin: 0,
                                        fontWeight: 700,
                                        fontSize: 14,
                                        color: "#0f172a",
                                      },
                                      children: [e.seater, " Seater Room"],
                                    }),
                                    (0, w.jsx)("p", {
                                      style: {
                                        margin: 0,
                                        fontSize: 12,
                                        color: "#64748b",
                                      },
                                      children: "Standard sharing room",
                                    }),
                                  ],
                                }),
                                (0, w.jsxs)("div", {
                                  style: { textAlign: "right" },
                                  children: [
                                    (0, w.jsxs)("p", {
                                      style: {
                                        margin: 0,
                                        fontWeight: 800,
                                        fontSize: 16,
                                        color:
                                          Y?.seater === e.seater
                                            ? "#0891b2"
                                            : "#0f172a",
                                      },
                                      children: ["₹", e.rent],
                                    }),
                                    (0, w.jsx)("p", {
                                      style: {
                                        margin: 0,
                                        fontSize: 10,
                                        color: "#94a3b8",
                                      },
                                      children: "per month",
                                    }),
                                  ],
                                }),
                              ],
                            },
                            t,
                          ),
                        ),
                      }),
                  (0, w.jsx)("label", {
                    style: {
                      display: "block",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 6,
                    },
                    children: "Security Deposit (₹)",
                  }),
                  (0, w.jsx)("input", {
                    type: "number",
                    value: ce,
                    onChange: (e) => ue(e.target.value),
                    placeholder: "e.g. 5000",
                    style: {
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: "1.5px solid #e2e8f0",
                      marginBottom: 16,
                      fontSize: 15,
                      boxSizing: "border-box",
                      outline: "none",
                    },
                  }),
                  Y &&
                    ce &&
                    (0, w.jsxs)("div", {
                      style: {
                        background: "linear-gradient(135deg, #0c1a2e, #0f2847)",
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 20,
                      },
                      children: [
                        (0, w.jsx)("p", {
                          style: {
                            margin: "0 0 8px",
                            fontSize: 12,
                            color: "rgba(255,255,255,0.6)",
                            fontWeight: 600,
                            letterSpacing: 1,
                          },
                          children: "FIRST MONTH SUMMARY",
                        }),
                        (0, w.jsxs)("div", {
                          style: {
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 4,
                          },
                          children: [
                            (0, w.jsx)("span", {
                              style: {
                                fontSize: 13,
                                color: "rgba(255,255,255,0.8)",
                              },
                              children: "Monthly Rent",
                            }),
                            (0, w.jsxs)("span", {
                              style: {
                                fontSize: 13,
                                fontWeight: 700,
                                color: "white",
                              },
                              children: ["₹", e],
                            }),
                          ],
                        }),
                        (0, w.jsxs)("div", {
                          style: {
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 8,
                          },
                          children: [
                            (0, w.jsx)("span", {
                              style: {
                                fontSize: 13,
                                color: "rgba(255,255,255,0.8)",
                              },
                              children: "Security Deposit (one-time)",
                            }),
                            (0, w.jsxs)("span", {
                              style: {
                                fontSize: 13,
                                fontWeight: 700,
                                color: "white",
                              },
                              children: ["₹", t],
                            }),
                          ],
                        }),
                        (0, w.jsxs)("div", {
                          style: {
                            display: "flex",
                            justifyContent: "space-between",
                            borderTop: "1px solid rgba(255,255,255,0.15)",
                            paddingTop: 8,
                          },
                          children: [
                            (0, w.jsx)("span", {
                              style: {
                                fontSize: 14,
                                fontWeight: 700,
                                color: "white",
                              },
                              children: "Total First Month",
                            }),
                            (0, w.jsxs)("span", {
                              style: {
                                fontSize: 18,
                                fontWeight: 800,
                                color: "#38bdf8",
                              },
                              children: ["₹", o],
                            }),
                          ],
                        }),
                      ],
                    }),
                  (0, w.jsxs)("div", {
                    style: { display: "flex", gap: 12 },
                    children: [
                      (0, w.jsx)("button", {
                        onClick: () => q(!1),
                        style: {
                          flex: 1,
                          padding: "12px",
                          background: "#f1f5f9",
                          border: "none",
                          borderRadius: 12,
                          fontWeight: 700,
                          color: "#475569",
                          cursor: "pointer",
                        },
                        children: "Cancel",
                      }),
                      (0, w.jsx)("button", {
                        onClick: Ae,
                        disabled: me || 0 === H.length,
                        style: {
                          flex: 1,
                          padding: "12px",
                          background: "#0891b2",
                          border: "none",
                          borderRadius: 12,
                          fontWeight: 700,
                          color: "white",
                          cursor: "pointer",
                          opacity: me || 0 === H.length ? 0.6 : 1,
                        },
                        children: me ? "Sending..." : "Send Offer",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        (0, w.jsxs)("div", {
          style: {
            background: "linear-gradient(135deg, #0c1a2e, #0f2847)",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            height: "auto",
            minHeight: 64,
            paddingTop: "max(env(safe-area-inset-top), 40px)",
            paddingBottom: 10,
            flexShrink: 0,
          },
          children: [
            (0, w.jsx)("button", {
              onClick: () => {
                (N("list"), F.current && (F.current(), (F.current = null)));
              },
              style: {
                background: "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: 10,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "white",
              },
              children: (0, w.jsx)("span", {
                className: "material-symbols-outlined",
                style: { fontSize: 20 },
                children: "arrow_back_ios_new",
              }),
            }),
            (0, w.jsx)("div", {
              style: {
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: A.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 800,
                fontSize: 15,
                flexShrink: 0,
              },
              children: A.initials,
            }),
            (0, w.jsxs)("div", {
              style: { flex: 1, minWidth: 0 },
              children: [
                (0, w.jsx)("p", {
                  style: {
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 800,
                    color: "white",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                  children: A.name,
                }),
                (0, w.jsx)("p", {
                  style: { margin: 0, fontSize: 12, color: "#94a3b8" },
                  children: A.sub,
                }),
              ],
            }),
            A.phone &&
              (0, w.jsx)("a", {
                href: `tel:${A.phone}`,
                style: {
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: 10,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  textDecoration: "none",
                  flexShrink: 0,
                },
                children: (0, w.jsx)("span", {
                  className: "material-symbols-outlined",
                  style: { fontSize: 20 },
                  children: "call",
                }),
              }),
          ],
        }),
        fe &&
          (0, w.jsxs)("div", {
            style: {
              background: "linear-gradient(135deg, #0891b2, #0e7490)",
              padding: "10px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            },
            children: [
              (0, w.jsxs)("div", {
                children: [
                  (0, w.jsx)("p", {
                    style: {
                      margin: 0,
                      fontSize: 12,
                      color: "white",
                      fontWeight: 700,
                    },
                    children: "✅ Room Offer Sent",
                  }),
                  (0, w.jsxs)("p", {
                    style: {
                      margin: "2px 0 0",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.85)",
                    },
                    children: [
                      fe.seaterLabel,
                      " · ₹",
                      fe.totalAmount,
                      " total first month",
                    ],
                  }),
                ],
              }),
              (0, w.jsx)("button", {
                onClick: Ce,
                style: {
                  background: "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 8,
                  padding: "5px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "white",
                  cursor: "pointer",
                },
                children: "Edit",
              }),
            ],
          }),
        (0, w.jsxs)("div", {
          style: { flex: 1, overflowY: "auto", padding: "16px 16px 130px" },
          children: [
            0 === W.length &&
              (0, w.jsxs)("div", {
                style: { textAlign: "center", paddingTop: 60 },
                children: [
                  (0, w.jsx)("span", {
                    className: "material-symbols-outlined",
                    style: { fontSize: 48, color: "#e2e8f0" },
                    children: "chat",
                  }),
                  (0, w.jsx)("p", {
                    style: { color: "#94a3b8", fontSize: 14, marginTop: 8 },
                    children: "No messages yet. Say hello!",
                  }),
                ],
              }),
            W.map((e) =>
              (0, w.jsx)(
                R,
                { msg: e, isMe: e.senderId === n.uid, onReviewDetails: xe },
                e.id,
              ),
            ),
            (0, w.jsx)("div", { ref: E }),
          ],
        }),
        (0, w.jsx)(S, { isOpen: !!he, onClose: () => xe(null), userId: he }),
        (0, w.jsxs)("div", {
          style: {
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 480,
            background: "white",
            borderTop: "1px solid #e2e8f0",
            padding: "8px 12px",
            paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
            boxSizing: "border-box",
            zIndex: 40,
            display: "flex",
            flexDirection: "column",
          },
          children: [
            "staff" !== A?.role &&
              (0, w.jsxs)("div", {
                style: {
                  display: "flex",
                  gap: "6px",
                  width: "100%",
                  paddingBottom: 8,
                  flexWrap: "wrap",
                },
                children: [
                  !K &&
                    (!A?.status || "Pending" === A?.status) &&
                    (0, w.jsxs)("button", {
                      onClick: Ce,
                      style: {
                        flex: 1,
                        minWidth: "30%",
                        padding: "10px 8px",
                        background: "#fffbeb",
                        color: "#d97706",
                        border: "1px solid #fde68a",
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 4,
                        boxShadow: "0 4px 12px rgba(217,119,6,0.15)",
                      },
                      children: ["🏠 ", fe ? "Edit Offer" : "Demand Token"],
                    }),
                  !de &&
                    (0, w.jsxs)("button", {
                      onClick: De,
                      style: {
                        flex: 1,
                        minWidth: "30%",
                        padding: "10px 8px",
                        background: "#f0fdf4",
                        color: "#16a34a",
                        border: "1px solid #bbf7d0",
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 4,
                        boxShadow: "0 4px 12px rgba(22,163,74,0.15)",
                      },
                      children: [
                        (0, w.jsx)("span", {
                          className: "material-symbols-outlined",
                          style: { fontSize: 18 },
                          children: "check_circle",
                        }),
                        "Allot Room",
                      ],
                    }),
                  "Current User" !== A?.status &&
                    (0, w.jsxs)("button", {
                      onClick: () => ke(!0),
                      style: {
                        flex: 1,
                        minWidth: "30%",
                        padding: "10px 8px",
                        background: "#eff6ff",
                        color: "#2563eb",
                        border: "1px solid #bfdbfe",
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 4,
                        boxShadow: "0 4px 12px rgba(37,99,235,0.15)",
                      },
                      children: [
                        (0, w.jsx)("span", {
                          className: "material-symbols-outlined",
                          style: { fontSize: 18 },
                          children: "bed",
                        }),
                        "Send Details",
                      ],
                    }),
                ],
              }),
            (0, w.jsxs)("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
              },
              children: [
                (0, w.jsxs)("div", {
                  style: { position: "relative" },
                  children: [
                    (0, w.jsx)("button", {
                      onClick: () => je(!Se),
                      style: {
                        width: 42,
                        height: 42,
                        borderRadius: "50%",
                        background: "white",
                        border: "1.5px solid #e2e8f0",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        color: "#64748b",
                      },
                      children: (0, w.jsx)("span", {
                        className: "material-symbols-outlined",
                        style: { fontSize: 22 },
                        children: "add_photo_alternate",
                      }),
                    }),
                    Se &&
                      (0, w.jsxs)("div", {
                        style: {
                          position: "absolute",
                          bottom: 50,
                          left: 0,
                          background: "white",
                          borderRadius: 12,
                          padding: 8,
                          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          zIndex: 10,
                          minWidth: 140,
                        },
                        children: [
                          (0, w.jsxs)("button", {
                            onClick: async () => {
                              je(!1);
                              try {
                                const {
                                    Camera: e,
                                    CameraResultType: t,
                                    CameraSource: n,
                                  } = await i(
                                    async () => {
                                      const {
                                        Camera: e,
                                        CameraResultType: t,
                                        CameraSource: n,
                                      } = await import("./esm-CuvQyE1y.js");
                                      return {
                                        Camera: e,
                                        CameraResultType: t,
                                        CameraSource: n,
                                      };
                                    },
                                    __vite__mapDeps([0, 1, 2]),
                                  ),
                                  o = await e.getPhoto({
                                    resultType: t.DataUrl,
                                    source: n.Camera,
                                    quality: 70,
                                  });
                                o && o.dataUrl && _e(o.dataUrl);
                              } catch (e) {
                                console.error("Camera error:", e);
                              }
                            },
                            style: {
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "10px 16px",
                              borderRadius: 8,
                              cursor: "pointer",
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#334155",
                              background: "transparent",
                              border: "none",
                              width: "100%",
                              textAlign: "left",
                            },
                            children: [
                              (0, w.jsx)("span", {
                                className: "material-symbols-outlined",
                                style: { fontSize: 20 },
                                children: "photo_camera",
                              }),
                              " Camera",
                            ],
                          }),
                          (0, w.jsxs)("label", {
                            style: {
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "10px 16px",
                              borderRadius: 8,
                              cursor: "pointer",
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#334155",
                            },
                            children: [
                              (0, w.jsx)("span", {
                                className: "material-symbols-outlined",
                                style: { fontSize: 20 },
                                children: "image",
                              }),
                              " Gallery",
                              (0, w.jsx)("input", {
                                type: "file",
                                accept: "image/*",
                                style: { display: "none" },
                                onChange: async (e) => {
                                  var t;
                                  e.target.files[0] &&
                                    (je(!1),
                                    _e(
                                      await ((t = e.target.files[0]),
                                      new Promise((e) => {
                                        const n = new FileReader();
                                        (n.readAsDataURL(t),
                                          (n.onload = (t) => {
                                            const n = new Image();
                                            ((n.src = t.target.result),
                                              (n.onload = () => {
                                                const t =
                                                  document.createElement(
                                                    "canvas",
                                                  );
                                                let i = n.width,
                                                  o = n.height;
                                                (i > o
                                                  ? i > 800 &&
                                                    ((o *= 800 / i), (i = 800))
                                                  : o > 800 &&
                                                    ((i *= 800 / o), (o = 800)),
                                                  (t.width = i),
                                                  (t.height = o),
                                                  t
                                                    .getContext("2d")
                                                    .drawImage(n, 0, 0, i, o),
                                                  e(
                                                    t.toDataURL(
                                                      "image/jpeg",
                                                      0.6,
                                                    ),
                                                  ));
                                              }));
                                          }));
                                      })),
                                    ));
                                },
                              }),
                            ],
                          }),
                        ],
                      }),
                  ],
                }),
                (0, w.jsx)("input", {
                  value: $,
                  onChange: (e) => P(e.target.value),
                  onKeyDown: (e) => "Enter" === e.key && Pe(),
                  placeholder: "Type a message...",
                  style: {
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 24,
                    border: "1.5px solid #e2e8f0",
                    outline: "none",
                    fontSize: 14,
                    background: "#f8fafc",
                    fontFamily: "inherit",
                  },
                }),
                (0, w.jsx)("button", {
                  onClick: Pe,
                  style: {
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: k,
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 4px 12px rgba(8,145,178,0.3)",
                  },
                  children: (0, w.jsx)("span", {
                    className: "material-symbols-outlined",
                    style: { fontSize: 20, color: "white" },
                    children: "send",
                  }),
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }
  return (0, w.jsxs)("div", {
    style: {
      maxWidth: 480,
      margin: "0 auto",
      minHeight: "100vh",
      background: "#f1f5f9",
      fontFamily: "'Hanken Grotesk', sans-serif",
      paddingBottom: 40,
    },
    children: [
      (0, w.jsxs)("div", {
        style: {
          background: "linear-gradient(135deg, #0c1a2e, #0f2847)",
          padding: "0 16px 20px",
          paddingTop: "max(env(safe-area-inset-top), 40px)",
        },
        children: [
          (0, w.jsxs)("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 14,
              height: 64,
            },
            children: [
              (0, w.jsx)("button", {
                onClick: () => e("/admin-dashboard"),
                style: {
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: 10,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "white",
                },
                children: (0, w.jsx)("span", {
                  className: "material-symbols-outlined",
                  style: { fontSize: 20 },
                  children: "arrow_back_ios_new",
                }),
              }),
              (0, w.jsxs)("div", {
                style: { flex: 1 },
                children: [
                  (0, w.jsx)("h1", {
                    style: {
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 800,
                      color: "white",
                    },
                    children: "Messages",
                  }),
                  (0, w.jsxs)("p", {
                    style: { margin: 0, fontSize: 12, color: "#94a3b8" },
                    children: [I.length, " contacts"],
                  }),
                ],
              }),
            ],
          }),
          (0, w.jsx)("div", {
            style: { display: "flex", gap: 6 },
            children: [
              ["all", "All"],
              ["student", "Students"],
              ["enquiry", "Leads"],
              ["staff", "Staff"],
            ].map(([e, t]) =>
              (0, w.jsx)(
                "button",
                {
                  onClick: () => O(e),
                  style: {
                    flex: 1,
                    padding: "7px 4px",
                    border: "none",
                    borderRadius: 10,
                    background:
                      M === e ? "rgba(255,255,255,0.18)" : "transparent",
                    color: M === e ? "white" : "#94a3b8",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  },
                  children: t,
                },
                e,
              ),
            ),
          }),
        ],
      }),
      (0, w.jsx)("div", {
        style: { padding: 16 },
        children: _
          ? (0, w.jsxs)("div", {
              style: { textAlign: "center", paddingTop: 60 },
              children: [
                (0, w.jsx)("span", {
                  className: "material-symbols-outlined",
                  style: {
                    fontSize: 40,
                    color: "#94a3b8",
                    animation: "spin 1s linear infinite",
                    display: "block",
                    marginBottom: 12,
                  },
                  children: "sync",
                }),
                (0, w.jsx)("p", {
                  style: { color: "#94a3b8", fontSize: 14 },
                  children: "Loading contacts...",
                }),
              ],
            })
          : 0 === Be.length
            ? (0, w.jsxs)("div", {
                style: { textAlign: "center", paddingTop: 60 },
                children: [
                  (0, w.jsx)("span", {
                    className: "material-symbols-outlined",
                    style: { fontSize: 56, color: "#e2e8f0" },
                    children: "chat",
                  }),
                  (0, w.jsx)("p", {
                    style: {
                      color: "#94a3b8",
                      fontSize: 15,
                      fontWeight: 600,
                      marginTop: 12,
                    },
                    children: "No contacts yet.",
                  }),
                ],
              })
            : Be.map((e) =>
                (0, w.jsxs)(
                  "div",
                  {
                    onClick: () => Ie(e),
                    style: {
                      background: "white",
                      borderRadius: 16,
                      border: "1px solid #e2e8f0",
                      marginBottom: 10,
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                      transition: "transform 0.15s",
                    },
                    onMouseEnter: (e) =>
                      (e.currentTarget.style.transform = "scale(1.01)"),
                    onMouseLeave: (e) =>
                      (e.currentTarget.style.transform = "scale(1)"),
                    children: [
                      (0, w.jsx)("div", {
                        style: {
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          background: e.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: 800,
                          fontSize: 17,
                          flexShrink: 0,
                        },
                        children: e.initials,
                      }),
                      (0, w.jsxs)("div", {
                        style: { flex: 1, minWidth: 0 },
                        children: [
                          (0, w.jsx)("p", {
                            style: {
                              margin: "0 0 2px",
                              fontWeight: 700,
                              fontSize: 15,
                              color: "#0f172a",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            },
                            children: e.name,
                          }),
                          (0, w.jsx)("p", {
                            style: {
                              margin: 0,
                              fontSize: 12,
                              color: "#64748b",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            },
                            children: e.sub,
                          }),
                        ],
                      }),
                      (0, w.jsx)("span", {
                        style: {
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 8,
                          background: Me[e.role] + "20",
                          color: Me[e.role],
                        },
                        children: e.role,
                      }),
                    ],
                  },
                  e.id,
                ),
              ),
      }),
      (0, w.jsx)("style", {
        children:
          "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }",
      }),
    ],
  });
}
export { z as default };
