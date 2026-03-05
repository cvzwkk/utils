# Edit sysctl.conf or use sysctl directly
sudo sysctl -w net_tcp_ipv6/tcp_timestamps=1
sudo sysctl -w net_tcp_ipv6/tcp_sack=1
# /etc/nftables.conf
#!/usr/sbin/nft -f

# Set default policies
table inet filter {
    default verdict = DROP
}

# Define zones (e.g., lo, eth0)
zone lo {
    content = lo()
}
zone ip4 {
    content = ip v4()
}
zone ip6 {
    content = ip v6()
}

# Rules for TCP SYN packets to detect SYN floods
rule ip tcp dport 80 sport 1024-65535 counter limit rate 100/s jump MARK --to-mark 0x1000

# Drop SYN packets with high ACK to detect SYN flood
rule ip tcp dport 80 sport 1024-65535 mark 0x1000 counter limit rate 100/s jump MARK --to-mark 0x1001

# Detect fragmented packets
rule ip ip6_fraglist
    counter limit rate 100/s jump MARK --to-mark 0x1002

# Detect fragmented packets with large offsets
rule ip ip6_fraglist mark 0x1002 counter limit rate 100/s jump MARK --to-mark 0x1003

# Detect fragmented packets with small offsets
rule ip ip6_fraglist mark 0x1002 counter limit rate 100/s jump MARK --to-mark 0x1004

# Drop fragmented packets with large offset differences
rule ip ip6_fraglist mark 0x1002 counter limit rate 100/s jump MARK --to-mark 0x1005

# Detect fragmented packets with small offset differences
rule ip ip6_fraglist mark 0x1002 counter limit rate 100/s jump MARK --to-mark 0x1006

# Drop fragmented packets with large offset differences
rule ip ip6_fraglist mark 0x1002 counter limit rate 100/s jump MARK --to-mark 0x1007

# Detect fragmented packets with small offset differences
rule ip ip6_fraglist mark 0x1002 counter limit rate 100/s jump MARK --to-mark 0x1008

# Detect fragmented packets with large offset differences
rule ip ip6_fraglist mark 0x1002 counter limit rate 100/s jump MARK --to-mark 0x1009

# Drop fragmented packets
