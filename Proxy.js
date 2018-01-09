class Proxy
{
    constructor(host, username = "", password = "")
    {
        this.host = host;
        this.username = username;
        this.password = password;
    }

    setHost(host)
    {
        this.host = host;
    }

    setUsername(username)
    {
        this.username = username;
    }

    setPassword(password)
    {
        this.password = password;
    }

    needAuthentication()
    {
        return this.username !== "";
    }
}

module.exports.Proxy = Proxy;
