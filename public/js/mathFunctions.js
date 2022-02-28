const calculateHP = (base_hp, level, ev_hp, iv_hp) => {
    base_hp = parseInt(base_hp);
    level = parseInt(level);
    ev_hp = parseInt(ev_hp);
    iv_hp = parseInt(iv_hp);
    
    return Math.floor(0.01 * (2 * base_hp + iv_hp + Math.floor(0.25 * ev_hp)) * level) + level + 10;
}

const calculateStat = (base_stat, level, ev, iv, natureMultiplier) => {
    base_stat = parseInt(base_stat);
    level = parseInt(level);
    ev = parseInt(ev);
    iv = parseInt(iv);
    natureMultiplier = parseInt(natureMultiplier);
    
    return Math.floor((Math.floor(0.01 * (2 * base_stat + iv + Math.floor(0.25 * ev)) * level) + 5) * natureMultiplier);
}
