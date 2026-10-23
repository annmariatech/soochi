function dimensions(scrap) {
  return {
    width: Number(scrap.width_cm ?? scrap.width ?? 0),
    height: Number(scrap.height_cm ?? scrap.height ?? 0),
  }
}

function requiredPieces(product) {
  return (product.pieces || []).flatMap((piece) =>
    Array.from({ length: Math.max(1, Number(piece.qty) || 1) }, () => ({
      width: Number(piece.w_cm),
      height: Number(piece.h_cm),
    })),
  )
}

function placePieces(scraps, pieces) {
  const bins = scraps.map((scrap) => {
    const { width, height } = dimensions(scrap)
    return { scrap, free: [{ x: 0, y: 0, width, height }], usedArea: 0 }
  })
  const unplaced = []

  for (const piece of [...pieces].sort((a, b) => b.width * b.height - a.width * a.height)) {
    let chosen = null
    for (const bin of bins) {
      for (let index = 0; index < bin.free.length; index += 1) {
        const space = bin.free[index]
        for (const [width, height] of [[piece.width, piece.height], [piece.height, piece.width]]) {
          if (width <= space.width && height <= space.height) {
            const score = space.width * space.height - width * height
            if (!chosen || score < chosen.score) {
              chosen = { bin, index, space, width, height, score }
            }
          }
        }
      }
    }
    if (!chosen) {
      unplaced.push(piece)
      continue
    }

    const { bin, index, space, width, height } = chosen
    bin.free.splice(index, 1)
    const rightWidth = space.width - width
    const bottomHeight = space.height - height
    if (rightWidth > 0) bin.free.push({ x: space.x + width, y: space.y, width: rightWidth, height })
    if (bottomHeight > 0) bin.free.push({ x: space.x, y: space.y + height, width: space.width, height: bottomHeight })
    bin.usedArea += piece.width * piece.height
  }

  return { bins, unplaced }
}

export function matchScrapsToProducts(scraps, products) {
  const results = []
  for (const product of products) {
    const pieces = requiredPieces(product)
    const { bins, unplaced } = placePieces(scraps, pieces)
    const totalArea = bins.reduce((sum, bin) => sum + dimensions(bin.scrap).width * dimensions(bin.scrap).height, 0)
    const usedArea = bins.reduce((sum, bin) => sum + bin.usedArea, 0)
    results.push({
      product_id: product.id,
      name: product.name,
      size_label: product.size_label,
      pieces: product.pieces || [],
      fabric_notes: product.fabric_notes || "",
      utilization_pct: totalArea ? Math.min(100, Math.round((usedArea / totalArea) * 100)) : 0,
      verdict: unplaced.length
        ? { suitable: false, reason: `Still need ${unplaced.length} pattern piece${unplaced.length === 1 ? "" : "s"}.` }
        : { suitable: true, reason: "All required pieces fit in the selected scraps." },
    })
  }
  return results.sort((a, b) => Number(b.verdict.suitable) - Number(a.verdict.suitable) || b.utilization_pct - a.utilization_pct)
}

export function matchProductToScraps(product, scraps, nearbyItems = []) {
  const pieces = requiredPieces(product)
  const { bins, unplaced } = placePieces(scraps, pieces)
  const matches = bins
    .filter((bin) => bin.usedArea > 0)
    .map((bin) => ({
      scrap: bin.scrap,
      utilization_pct: Math.round((bin.usedArea / (dimensions(bin.scrap).width * dimensions(bin.scrap).height)) * 100),
      verdict: { suitable: true, reason: `Fabric allocated toward ${product.name}.` },
    }))

  const nearby = []
  for (const item of nearbyItems) {
    if (!unplaced.length) break
    const scrap = item.scrap || item
    const fit = placePieces([scrap], unplaced)
    if (fit.unplaced.length < unplaced.length) {
      nearby.push({
        ...item,
        scrap,
        verdict: { suitable: true, reason: `Could help cover ${unplaced.length - fit.unplaced.length} remaining piece(s).` },
      })
    }
  }

  const fullyCoveredNearby = placePieces(
    [...scraps, ...nearby.map((item) => item.scrap)],
    pieces,
  ).unplaced.length === 0
  const shortage = unplaced.length && !fullyCoveredNearby
    ? { message: `${unplaced.length} required piece${unplaced.length === 1 ? "" : "s"} still need fabric.` }
    : null

  return { matches, shortage, nearby }
}
