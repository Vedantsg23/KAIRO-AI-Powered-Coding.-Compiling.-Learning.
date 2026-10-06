/* ATTACK:  open an outbound TCP connection (data exfiltration, attacks on others).
 * EXPECT:  connect fails (network_mode=none); prints "connect failed". */
#include <arpa/inet.h>
#include <errno.h>
#include <netinet/in.h>
#include <stdio.h>
#include <string.h>
#include <sys/socket.h>

int main(void) {
    int s = socket(AF_INET, SOCK_STREAM, 0);
    if (s < 0) {
        printf("socket failed: %s\n", strerror(errno));
        return 0;
    }
    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(80);
    inet_pton(AF_INET, "1.1.1.1", &addr.sin_addr);
    if (connect(s, (struct sockaddr *)&addr, sizeof addr) < 0) {
        printf("connect failed: %s\n", strerror(errno));
        return 0;
    }
    printf("CONNECTED\n");
    return 0;
}
