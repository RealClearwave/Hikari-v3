export function getUsernameColor(role?: number, accepted?: number) {
  if (Number(role) === 1) {
    return 'purple.600';
  }

  const ac = Number.isFinite(Number(accepted)) ? Number(accepted) : 0;
  if (ac >= 500) return 'red.500';
  if (ac >= 200) return 'orange.500';
  if (ac >= 50) return 'green.500';
  if (ac >= 10) return 'blue.500';
  return 'gray.500';
}
