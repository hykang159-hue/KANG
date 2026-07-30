import { NextResponse } from "next/server";
import { getPokemonDetail } from "@/app/poke/get-pokemon-detail";
import {
  clearPartySlot,
  deleteParty,
  getParty,
  setPartySlot,
} from "@/app/poke/party-store";

type PartyRouteProps = {
  params: Promise<{ id: string }>;
};

type MemberBody = {
  pokemonId?: unknown;
  slot?: unknown;
};

function parsePositiveInt(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isInteger(number) || number <= 0) return null;
  return number;
}

export async function GET(_request: Request, { params }: PartyRouteProps) {
  try {
    const { id } = await params;
    const partyId = Number(id);

    if (!Number.isInteger(partyId) || partyId <= 0) {
      return NextResponse.json(
        { error: "유효하지 않은 파티 ID입니다." },
        { status: 400 }
      );
    }

    const party = getParty(partyId);

    if (!party) {
      return NextResponse.json(
        { error: "파티를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ party });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: PartyRouteProps) {
  try {
    const { id } = await params;
    const partyId = Number(id);

    if (!Number.isInteger(partyId) || partyId <= 0) {
      return NextResponse.json(
        { error: "유효하지 않은 파티 ID입니다." },
        { status: 400 }
      );
    }

    const party = getParty(partyId);
    if (!party) {
      return NextResponse.json(
        { error: "파티를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const body = (await request.json()) as MemberBody;
    const pokemonId = parsePositiveInt(body.pokemonId);
    const slot = parsePositiveInt(body.slot);

    if (!pokemonId) {
      return NextResponse.json(
        { error: "pokemonId는 양의 정수여야 합니다." },
        { status: 400 }
      );
    }

    if (!slot || slot > 6) {
      return NextResponse.json(
        { error: "slot은 1~6 사이여야 합니다." },
        { status: 400 }
      );
    }

    if (party.members.some((member) => member.slot === slot)) {
      return NextResponse.json(
        { error: `슬롯 ${slot}은 이미 사용 중입니다.` },
        { status: 409 }
      );
    }

    const pokemon = await getPokemonDetail(String(pokemonId));

    setPartySlot(partyId, slot, {
      pokemonId: pokemon.id,
      nameKo: pokemon.name.ko,
      nameEn: pokemon.name.en,
      imageUrl: pokemon.image.front,
    });

    const updatedParty = getParty(partyId);
    return NextResponse.json({ party: updatedParty }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";

    if (message.includes("슬롯은 1~6")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: PartyRouteProps) {
  try {
    const { id } = await params;
    const partyId = Number(id);

    if (!Number.isInteger(partyId) || partyId <= 0) {
      return NextResponse.json(
        { error: "유효하지 않은 파티 ID입니다." },
        { status: 400 }
      );
    }

    const party = getParty(partyId);
    if (!party) {
      return NextResponse.json(
        { error: "파티를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    let slot = parsePositiveInt(url.searchParams.get("slot"));
    let pokemonId = parsePositiveInt(url.searchParams.get("pokemonId"));

    if (slot === null || pokemonId === null) {
      try {
        const body = (await request.json()) as MemberBody;
        slot ??= parsePositiveInt(body.slot);
        pokemonId ??= parsePositiveInt(body.pokemonId);
      } catch {
        // body가 없으면 query만 사용
      }
    }

    if (slot === null) {
      deleteParty(partyId);
      return new NextResponse(null, { status: 204 });
    }

    if (slot > 6) {
      return NextResponse.json(
        { error: "slot은 1~6 사이여야 합니다." },
        { status: 400 }
      );
    }

    const member = party.members.find((entry) => entry.slot === slot);
    if (!member) {
      return NextResponse.json(
        { error: `슬롯 ${slot}은 비어 있습니다.` },
        { status: 404 }
      );
    }

    if (pokemonId !== null && member.pokemonId !== pokemonId) {
      return NextResponse.json(
        { error: `슬롯 ${slot}의 포켓몬이 pokemonId와 일치하지 않습니다.` },
        { status: 409 }
      );
    }

    clearPartySlot(partyId, slot);
    const updatedParty = getParty(partyId);
    return NextResponse.json({ party: updatedParty });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
